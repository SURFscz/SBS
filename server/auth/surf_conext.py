from urllib import request


def surf_public_signing_certificate(current_app):
    eb_config = current_app.app_config.engine_block
    cert = eb_config.public_key
    if not eb_config.public_key or not eb_config.public_key.strip():
        cert = request.urlopen(eb_config.public_key_url).read().decode()
    return cert
