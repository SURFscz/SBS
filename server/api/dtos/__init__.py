# Importing the DTO modules here lets pydantic2ts generate all frontend types from this package in one run,
# since it only discovers submodules that are attributes of the module it is pointed at.
from server.api.dtos import collaboration_dtos  # noqa: F401
from server.api.dtos import user_token_dtos  # noqa: F401
