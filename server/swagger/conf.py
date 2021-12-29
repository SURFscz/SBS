from flask import Blueprint, send_from_directory, current_app

SWAGGER_TEMPLATE = {
    "securityDefinitions": {
        "APIKeyHeader": {
            "type": "apiKey", "name": "Authorization", "in": "header"
        }
    }
}

swagger_specs = Blueprint("swagger_specs", __name__, url_prefix="/swagger")


@swagger_specs.get("/<path:filename>")
def base_static(filename):
    return send_from_directory(current_app.root_path + "/swagger", filename)
