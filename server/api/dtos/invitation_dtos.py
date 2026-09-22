from pydantic import BaseModel, ConfigDict

from server.api.dtos.base import EpochSeconds
from server.api.dtos.collaboration_dtos import InvitationCollaborationDTO, SanitizedUserDTO


class InvitationByHashDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hash: str
    collaboration_id: int
    intended_role: str | None
    expiry_date: EpochSeconds | None
    # The inviter, of whom only the name and the email are disclosed
    user: SanitizedUserDTO
    collaboration: InvitationCollaborationDTO


class InvitationByHashExpandedDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invitation: InvitationByHashDTO
    # The service contacts per service id and the organisation admins, both needed to accept the policies
    service_emails: dict[int, list[str]]
    admin_emails: list[str]
