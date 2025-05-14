import logging

from flask import session, g as request_context


class CustomAdapter(logging.LoggerAdapter):

    def __init__(self, logger):
        if "user" in session and "uid" in session["user"]:
            user_name = session["user"]["uid"]
        elif "api_user" in request_context:
            user_name = request_context.api_user.name
        elif "service_token" in request_context:
            user_name = request_context.service_token
        else:
            user_name = "ext_api"
        super().__init__(logger, {"user": user_name})

    def process(self, msg, kwargs):
        return f"user: {self.extra['user']}, {msg}", kwargs


def ctx_logger(name=None):
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # Ensure the logger captures debug messages
    return CustomAdapter(logger)
