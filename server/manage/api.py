# from requests.auth import HTTPBasicAuth
#
#
# def _replace_none_values(d: dict):
#     for k, v in d.items():
#         if isinstance(v, dict):
#             _replace_none_values(v)
#         elif not v:
#             del d[k]
#     return d
#
#
# # Get the headers with the basic authentication
# def scim_headers(service: Service, is_delete=False):
#     plain_bearer_token = decrypt_scim_bearer_token(service)
#     headers = {"Authorization": f"Bearer {plain_bearer_token}",
#                "X-Service": str(service.id)}
#     if not is_delete:
#         headers["Accept"] = "application/scim+json"
#         headers["Content-Type"] = "application/scim+json"
#     return headers
#
# request_method = requests.put if scim_object else requests.post
# url = f"{service.scim_url}{postfix}"
# basic = HTTPBasicAuth('user', 'pass')
# return request_method(url, json=replace_none_values(scim_dict), headers=scim_headers(service), timeout=10)
