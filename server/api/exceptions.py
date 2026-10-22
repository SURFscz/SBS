from werkzeug.exceptions import HTTPException


class APIBadRequest(HTTPException):
    code = 400
    description = (
        "Invalid API request."
    )


class ManageSyncException(HTTPException):
    code = 502
    description = (
        "Error in syncing the service data to Manage."
    )
