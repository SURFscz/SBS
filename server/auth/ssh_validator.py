import base64
import re
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

    # ---- 1 OpenSSH format ----------------------------------------
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

    return False
