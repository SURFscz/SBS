from requests.auth import HTTPBasicAuth

manage_initialized = False
manage_basic_auth = None
manage_base_url = None
manage_headers = {"Accept": "application/json", "Content-Type": "application/son"}


def init_manage(manage_conf):
    global manage_initialized
    global manage_base_url
    global manage_basic_auth

    manage_basic_auth = HTTPBasicAuth(manage_conf.user, manage_conf.password)
    manage_base_url = manage_conf.base_url[:-1] if manage_conf.base_url.endswith("/") else manage_conf.base_url
    manage_initialized = True
