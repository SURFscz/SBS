from enum import Enum


class UserCode(Enum):
    USER_UNKNOWN = 1
    USER_IS_SUSPENDED = 2
    SERVICE_UNKNOWN = 3
    SERVICE_NOT_CONNECTED = 4
    NEW_FREE_RIDE_USER = 97
    MISSING_ATTRIBUTES = 98
    AUP_NOT_AGREED = 99
    SERVICE_AUP_NOT_AGREED = 100
    SECOND_FA_REQUIRED = 101

    @staticmethod
    def dead_end(user_code_value: int):
        return user_code_value in [UserCode.USER_UNKNOWN.value,
                                   UserCode.SERVICE_UNKNOWN.value,
                                   UserCode.SERVICE_NOT_CONNECTED.value]
