import base64

import paramiko
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

ssh2_public_key_header = "BEGIN SSH2 PUBLIC KEY"
rsa_public_key_header = "BEGIN RSA PUBLIC KEY"
public_key_header = "BEGIN PUBLIC KEY"


def convert_to_open_ssh(public_key: str):
    ssh2_key = ssh2_public_key_header in public_key
    valid_public_key = rsa_public_key_header in public_key or public_key_header in public_key
    if not ssh2_key and not valid_public_key:
        return public_key

    if ssh2_key:
        lines = public_key.strip().splitlines()
        b64_key = "".join(line for line in lines if not line.startswith("----") and not line.startswith("Comment"))

        key_blob = base64.b64decode(b64_key.encode('ascii'))
        key = paramiko.RSAKey(data=key_blob)

        # Export in OpenSSH format
        return f"{key.get_name()} {key.get_base64()}"

    public_key = serialization.load_pem_public_key(public_key.encode(), backend=default_backend())

    return public_key.public_bytes(encoding=serialization.Encoding.OpenSSH,
                                   format=serialization.PublicFormat.OpenSSH) \
        .decode()
