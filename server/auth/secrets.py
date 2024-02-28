import base64
import hashlib
import json
import secrets
import string
from secrets import token_urlsafe, SystemRandom

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from werkzeug.exceptions import SecurityError, BadRequest

SYSTEM_RANDOM = SystemRandom()

MIN_SECRET_LENGTH = 43


def secure_hash(secret):
    return f"sha3_512_{hashlib.sha3_512(bytes(secret, 'utf-8')).hexdigest()}"


def generate_token():
    return f"A{token_urlsafe()}"


def hash_secret_key(data, attr_name="hashed_secret"):
    secret = data[attr_name]
    if len(secret) < MIN_SECRET_LENGTH:
        raise SecurityError(f"minimal length of secret for API key is {MIN_SECRET_LENGTH}")
    data[attr_name] = secure_hash(secret)
    return data


def generate_ldap_password_with_hash():
    start = SYSTEM_RANDOM.choice(string.ascii_letters)
    ldap_characters = string.ascii_letters + string.digits + "@%=+_-"
    password = start + "".join(SYSTEM_RANDOM.sample(population=ldap_characters, k=31))
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8"), password


def encrypt_secret(encryption_key: str, plain_secret, context: dict) -> str:
    nonce = secrets.token_urlsafe()
    context["plain_secret"] = plain_secret
    base64_encoded_context = {key: base64.b64encode(str(value).encode()).decode() for (key, value) in context.items()}
    aes_gcm = AESGCM(base64.b64decode(encryption_key))
    data = json.dumps(base64_encoded_context).encode()
    encrypted_context = aes_gcm.encrypt(nonce.encode(), data, None)
    return f"{nonce}:{base64.b64encode(encrypted_context).decode()}"


def decrypt_secret(encryption_key: str, encrypted_value: str, context: dict) -> str:
    aes_gcm = AESGCM(base64.b64decode(encryption_key))
    index = encrypted_value.index(':')
    nonce = encrypted_value[0:index]
    encrypted_context = encrypted_value[index + 1:]
    data = base64.b64decode(encrypted_context)
    decrypted = aes_gcm.decrypt(nonce.encode(), data, None).decode()
    base64_context = json.loads(decrypted)
    decrypted_context = {key: base64.b64decode(value.encode()).decode() for (key, value) in base64_context.items()}
    for key, value in context.items():
        if str(value) != decrypted_context[key]:
            raise BadRequest(f"Invalid value(={decrypted_context[key]}) for {key}, expected {value}")
    return decrypted_context["plain_secret"]
