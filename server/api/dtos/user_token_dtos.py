from pydantic import BaseModel, ConfigDict

from server.api.dtos.base import EpochSeconds


class UserTokenDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    service_id: int
    created_at: EpochSeconds
    last_used_date: EpochSeconds | None
