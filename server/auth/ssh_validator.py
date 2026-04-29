import base64
import re
import struct

from cryptography.hazmat.primitives import serialization

OPENSSH_KEY_TYPES = {
    "ssh-rsa",
    "ssh-ed25519",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com",
    "ssh-ed25519",
}


def is_valid_ssh_public_key(key: str) -> bool:
    """
    Validate SSH public keys in common formats:
    - OpenSSH authorized_keys format
    - PEM public key
    - PKCS#1 RSA public key
    - SSH2 public key
    """

    if not key or not isinstance(key, str):
        return False
    key = key.strip().rstrip("\n").replace("\\n", "").rstrip("$")

    for key_type in OPENSSH_KEY_TYPES:
        if key.startswith(key_type + "_"):
            key = key_type + key[key.index(" "):]
            break

    # Fix missing space between key type and key data
    for key_type in OPENSSH_KEY_TYPES:
        if key.startswith(key_type) and not key.startswith(key_type + " "):
            key = key_type + " " + key[len(key_type):]
            break

    # ---- 1 SSH2 RFC4716 format -----------------------------------
    if "BEGIN SSH2 PUBLIC KEY" in key:
        try:
            # Normalize SSH2 format - fix missing newlines
            # Strip all existing newlines and rebuild cleanly
            key = key.replace("\r\n", "").replace("\n", "").replace("\r", "")
            key = key.replace("---- BEGIN SSH2 PUBLIC KEY ----", "---- BEGIN SSH2 PUBLIC KEY ----\n")
            key = key.replace("---- END SSH2 PUBLIC KEY ----", "\n---- END SSH2 PUBLIC KEY ----")
            key = re.sub(r'(Comment:[^\n]+)', r'\1\n', key)

            match = re.search(r'(AAAA[A-Za-z0-9+/=]+)', key)
            if not match:
                return False
            body = match.group(1)

            # Decode to get the raw bytes
            decoded = base64.b64decode(body)

            # Extract key type from the wire format:
            # First 4 bytes = big-endian uint32 length of the key-type string
            length = struct.unpack(">I", decoded[:4])[0]
            key_type = decoded[4:4 + length].decode()  # e.g. "ssh-rsa", "ssh-ed25519"

            # Reconstruct OpenSSH public key format that load_ssh_public_key expects
            openssh_key = f"{key_type} {body}".encode()

            serialization.load_ssh_public_key(openssh_key)
            return True
        except Exception:
            return False

    # ---- 2 OpenSSH format ----------------------------------------
    if not key.startswith("-----"):
        parts = key.split()

        if len(parts) < 2:
            return False

        key_type = parts[0]
        key_data = parts[1].rstrip("$")

        if key_type not in OPENSSH_KEY_TYPES:
            return False
        # Strip any non-base64 characters from the end of key_data

        grouped = re.match(r'[A-Za-z0-9+/=]+', key_data)
        if grouped:
            key_data = grouped.group(0)

        try:
            base64.b64decode(key_data, validate=True)
        except Exception:
            return False

        # ensure decoded key actually parses
        try:
            serialization.load_ssh_public_key(key.encode())
            return True
        except Exception:
            return False

    # ---- 2 PEM public key ----------------------------------------
    if "BEGIN PUBLIC KEY" in key or "BEGIN RSA PUBLIC KEY" in key:
        try:
            serialization.load_pem_public_key(key.encode())
            return True
        except Exception:
            return False

    return False
