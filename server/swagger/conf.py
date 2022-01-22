from flask import Blueprint, send_from_directory, current_app

SWAGGER_TEMPLATE = {
    "info": {
        "title": "SRAM API",
        "description": "Documentation for SRAM external API",
        "version": "1.0",
    },
    "securityDefinitions": {
        "APIKeyHeader": {
            "type": "apiKey", "name": "Authorization", "in": "header"
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

swagger_specs = Blueprint("swagger_specs", __name__, url_prefix="/swagger")


@swagger_specs.get("/<path:filename>")
def base_static(filename):
    return send_from_directory(current_app.root_path + "/swagger", filename)
