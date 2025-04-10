from cryptography.hazmat.primitives import serialization


def convert_to_open_ssh(ssh_key: str):
    public_key = serialization.load_ssh_public_key(ssh_key.encode())
    openssh_key = public_key.public_bytes(encoding=serialization.Encoding.OpenSSH,
                                          format=serialization.PublicFormat.OpenSSH)
    return openssh_key.decode()
