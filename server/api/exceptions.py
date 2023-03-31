from werkzeug.exceptions import HTTPException


class APIBadRequest(HTTPException):
    code = 400
    description = (
        "Invalid API request."
    )
