import requests


def surf_public_signing_certificate(current_app):
    eb_config = current_app.app_config.engine_block
    cert = eb_config.public_key
    url = eb_config.public_key_url
    if not cert or not cert.strip():
        cert = requests.get(url).content
    return cert
