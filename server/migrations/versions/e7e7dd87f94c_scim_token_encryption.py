"""SCIM_token encryption

Revision ID: e7e7dd87f94c
Revises: bfff5ff0d8e6
Create Date: 2024-02-29 09:07:10.144305

"""
import base64
import json
import os
import secrets

import yaml
from alembic import op
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from munch import munchify
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'e7e7dd87f94c'
down_revision = 'bfff5ff0d8e6'
branch_labels = None
depends_on = None


def encrypt_secret(encryption_key: str, plain_secret: str, context: dict) -> str:
    nonce = secrets.token_urlsafe()
    context["plain_secret"] = plain_secret
    aes_gcm = AESGCM(base64.b64decode(encryption_key))
    data = json.dumps(context).encode()
    encrypted_context = aes_gcm.encrypt(nonce.encode(), data, None)
    return f"{nonce}:{base64.b64encode(encrypted_context).decode()}"


def upgrade():
    config_file_location = os.environ.get("CONFIG", "config/config.yml")
    file = f"{config_file_location}"
    with open(file) as f:
        config = munchify(yaml.load(f.read(), Loader=yaml.FullLoader))
        encryption_key = config.encryption_key
        conn = op.get_bind()
        result = conn.execute(text("SELECT id, scim_url, scim_bearer_token FROM services WHERE scim_url IS NOT NULL "
                                   "AND scim_bearer_token IS NOT NULL"))
        for row in result:
            identifier = row[0]
            scim_url = row[1]
            scim_bearer_token = row[2]
            context = {
                "scim_url": scim_url,
                "identifier": identifier,
                "table_name": "services"
            }
            secret = encrypt_secret(encryption_key, scim_bearer_token, context)
            conn.execute(text("UPDATE services SET scim_bearer_token = :scim_bearer_token WHERE id = :id"),
                         dict(scim_bearer_token=secret, id=identifier))


def downgrade():
    pass
