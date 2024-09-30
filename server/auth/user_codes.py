USER_UNKNOWN = 1
USER_IS_SUSPENDED = 2
SERVICE_UNKNOWN = 3
SERVICE_NOT_CONNECTED = 4
NEW_FREE_RIDE_USER = 97
MISSING_ATTRIBUTES = 98
AUP_NOT_AGREED = 99
SERVICE_AUP_NOT_AGREED = 100
SECOND_FA_REQUIRED = 101


def status_to_string(status):
    if status == USER_UNKNOWN:
        return "USER_UNKNOWN"
    elif status == USER_IS_SUSPENDED:
        return "USER_IS_SUSPENDED"
    elif status == SERVICE_UNKNOWN:
        return "SERVICE_UNKNOWN"
    elif status == SERVICE_NOT_CONNECTED:
        return "SERVICE_NOT_CONNECTED"
    elif status == NEW_FREE_RIDE_USER:
        return "NEW_FREE_RIDE_USER"
    elif status == AUP_NOT_AGREED:
        return "AUP_NOT_AGREED"
    elif status == SECOND_FA_REQUIRED:
        return "SECOND_FA_REQUIRED"
    else:
        return "UNKNOWN_STATUS"
