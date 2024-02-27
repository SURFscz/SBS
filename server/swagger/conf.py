from flasgger import Swagger
from flask import Blueprint, send_from_directory, current_app

SWAGGER_TEMPLATE = {
    "info": {
        "title": "SRAM API",
        "description": "Documentation for the public APIs of SURF Research Access Management",
        "version": "1.0",
    },
    "tags": [
        {
            "name": "Organisation",
            "description": "All endpoints for organisations using an organisation API token"
        },
        {
            "name": "SCIM client",
            "description": "All endpoints for external SCIM clients using a SCIM token"
        },
        {
            "name": "PAM web login",
            "description": "All endpoints for external services using the PAM web login"
        },
        {
            "name": "User token introspection",
            "description": "All endpoints for external services using an Introspect token"
        },

    ],
    "securityDefinitions": {
        "Organisation": {
            "type": "apiKey", "name": "Authorization", "in": "header",
            "description": "Authorization header using the bearer scheme with an organisation API token. "
                           "Example: \"Authorization: Bearer {api_token}\""
        },
        "Service": {
            "type": "apiKey", "name": "Authorization", "in": "header",
            "description": "Authorization header using the bearer scheme with PAM web login, SCIM client and User introspection. "
                           "Example: \"Authorization: Bearer {token}\""
        }
    }
}

SWAGGER_CONFIG = {
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/swagger_api/apispec.json',
            "rule_filter": lambda rule: True,  # all in
            "model_filter": lambda tag: True,  # all in
        }
    ],
}


def init_swagger(app):
    Swagger(app, template=SWAGGER_TEMPLATE, config=SWAGGER_CONFIG, merge=True)


swagger_specs = Blueprint("swagger_specs", __name__, url_prefix="/swagger")


@swagger_specs.get("/<path:filename>")
def base_static(filename):
    result = send_from_directory(current_app.root_path + "/swagger/public", filename)
    result.status_code = 200
    result.cache_control.clear()
    result.cache_control.max_age = 60 * 60
    return result
