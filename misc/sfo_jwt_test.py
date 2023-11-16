# This is a tool to test SBS's SFO endpoint.
# to use it, do the following:
# - adjust the variables below (base_url, redirect_url, subject, audience_sbs) to the correct values
# - run the script
# - save the generated "eduteams jwks" to a location on the web
# - point SBS's jwks_endpoint to this file
# - make sure SBS's sfo_eduteams_redirect_uri matches the value below
# - visit the url that is output by the script
# - after entering your token and being redirected, decode the jwt token bij copying it from the url to (e.g., https://jwt.io/)

from jwcrypto import jwk, jwt
import time
import json
import uuid

base_url = "https://test.sram.surf.nl/api/mfa/sfo"
redirect_url = "https://localhost/redirect_test"
subject = 'urn:john'
audience_sbs = 'SBS-appid'

# create or load key
privkey_filename = "privkey.json"
try:
    with open(privkey_filename, 'rb') as fd:
        keydata = json.load(fd)
        eduteams_key = jwk.JWK(**keydata)
    print("Loaded key from file")
except (FileNotFoundError, json.JSONDecodeError):
    print("Generating key from scrtach")
    eduteams_key = jwk.JWK.generate(kty='RSA', size=512, use='sig', kid=str(uuid.uuid4()))

eduteams_pubkey = eduteams_key.export_public()
eduteams_privkey = eduteams_key.export_private()

print("Eduteams key is:")
print(json.dumps(json.loads(eduteams_privkey), indent=4))
with open("privkey.json", "wb") as privkeyfile:
    privkeyfile.write(eduteams_privkey.encode('utf-8'))

print("Eduteams jwks is:")
print(json.dumps({"keys": [json.loads(eduteams_pubkey)]}, indent=4))


# create jwt
content = {
    'sub': subject,
    'auth_time': time.time() - 1,
    'nonce': str(uuid.uuid4()),
    'iss': redirect_url,
    'iat': time.time() - 1,
    'exp': time.time() + 900,
    'aud': [audience_sbs]
}
token = jwt.JWT(header={"alg": "RS256", "kid": eduteams_key.get("kid")},
                claims=content)
token.make_signed_token(eduteams_key)
print("jwt content is:")
print(json.dumps(content, indent=4))
print("serialized token is:")
print(token.serialize())
print(f"length is {len(token.serialize())}")

print(f"url: {base_url}?access_token={token.serialize()}")
