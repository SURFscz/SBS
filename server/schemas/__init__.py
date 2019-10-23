import os

from flask_jsonschema_validator import JSONSchemaValidator


class AppWrapper(object):
    def __init__(self):
        self.extensions = {}


json_schema_validator = JSONSchemaValidator(app=AppWrapper(), root=f"{os.path.dirname(os.path.realpath(__file__))}")
