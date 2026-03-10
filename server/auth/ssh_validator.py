import base64
import re
<<<<<<< HEAD
import struct

=======
>>>>>>> main
from cryptography.hazmat.primitives import serialization

OPENSSH_KEY_TYPES = {
    "ssh-rsa",
    "ssh-ed25519",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com",
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

    key = key.strip()

<<<<<<< HEAD
    # ---- 1 SSH2 RFC4716 format -----------------------------------
    if "BEGIN SSH2 PUBLIC KEY" in key:
        try:
            # Strip RFC 4716 headers (4 dashes, not 5)
            body = re.sub(r"---- (BEGIN|END) SSH2 PUBLIC KEY ----", "", key)
            # Strip comment lines
            body = re.sub(r"Comment:.*\n?", "", body)
            # Collapse all whitespace to get clean base64
            body = "".join(body.split())

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
=======
    # ---- 1 OpenSSH format ----------------------------------------
>>>>>>> main
    if not key.startswith("-----"):
        parts = key.split()

        if len(parts) < 2:
            return False

        key_type = parts[0]
        key_data = parts[1]

        if key_type not in OPENSSH_KEY_TYPES:
            return False

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

<<<<<<< HEAD
=======
    # ---- 3 SSH2 RFC4716 format -----------------------------------
    if "BEGIN SSH2 PUBLIC KEY" in key:
        try:
            body = re.sub(r"-----(BEGIN|END) SSH2 PUBLIC KEY-----", "", key)
            body = re.sub(r"Comment:.*", "", body)
            body = "".join(body.split())

            decoded = base64.b64decode(body)

            serialization.load_ssh_public_key(decoded)
            return True
        except Exception:
            return False

>>>>>>> main
    return False
