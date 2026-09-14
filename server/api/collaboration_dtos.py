import time
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer


def _epoch_seconds(value: datetime) -> int:
    return int(time.mktime(value.timetuple()))


# All dates are sent as epoch seconds, like DynamicExtendedJSONProvider does for the ORM models.
# Serializing here instead of in the json provider keeps the generated TypeScript types honest.
EpochSeconds = Annotated[datetime, PlainSerializer(_epoch_seconds, return_type=int)]


class UserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    email: str | None
    username: str | None
    schac_home_organisation: str | None


class CollaborationMembershipDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role: str
    status: str
    expiry_date: EpochSeconds | None
    created_at: EpochSeconds
    user: UserDTO


class GroupDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    short_name: str
    identifier: str
    global_urn: str
    auto_provision_members: bool | None
    created_at: EpochSeconds
    service_group_id: int | None
    collaboration_memberships: list[CollaborationMembershipDTO]


class ServiceMembershipDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserDTO


class ServiceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    logo: str | None
    uri: str | None
    uri_info: str | None
    privacy_policy: str | None
    accepted_user_policy: str | None
    contact_email: str | None
    support_email: str | None
    token_enabled: bool | None
    token_validity_days: int | None
    organisation_name: str | None
    service_memberships: list[ServiceMembershipDTO]


class SchacHomeOrganisationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str


class OrganisationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    short_name: str
    logo: str | None
    accepted_user_policy: str | None
    schac_home_organisations: list[SchacHomeOrganisationDTO]


class CollaborationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    short_name: str
    logo: str | None
    website_url: str | None
    support_email: str | None
    organisation_id: int
    status: str
    expiry_date: EpochSeconds | None
    last_activity_date: EpochSeconds
    disclose_member_information: bool | None
    disclose_email_information: bool | None
    collaboration_memberships_count: int
    organisation: OrganisationDTO
    collaboration_memberships: list[CollaborationMembershipDTO]
    groups: list[GroupDTO]
    services: list[ServiceDTO]


# The DTO's below are the additions the admin view of a collaboration needs on top of the lite / member view.

class UnitDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TagDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tag_value: str


class OrganisationDetailDTO(OrganisationDTO):
    services_restricted: bool | None
    service_connection_requires_approval: bool | None
    invitation_message: str | None
    invitation_sender_name: str | None
    units: list[UnitDTO]


class ServiceGroupServiceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ServiceGroupDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    service_id: int
    service: ServiceGroupServiceDTO


class GroupDetailDTO(GroupDTO):
    service_group: ServiceGroupDTO | None


class ServiceDetailDTO(ServiceDTO):
    uuid4: str


class InvitationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invitee_email: str
    intended_role: str
    status: str
    expiry_date: EpochSeconds | None
    created_at: EpochSeconds
    created_by: str
    # Only set once the invitee is a known user, the frontend falls back on created_by
    user: UserDTO | None


class JoinRequestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hash: str | None
    status: str
    message: str | None
    rejection_reason: str | None
    created_at: EpochSeconds
    user: UserDTO


class RequesterDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str | None
    uid: str


class ServiceConnectionRequestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: EpochSeconds
    service: ServiceDetailDTO
    requester: RequesterDTO


class CollaborationDetailDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    identifier: str
    name: str
    description: str
    short_name: str
    logo: str | None
    website_url: str | None
    support_email: str | None
    organisation_id: int
    status: str
    expiry_date: EpochSeconds | None
    last_activity_date: EpochSeconds
    disable_join_requests: bool | None
    disclose_member_information: bool | None
    disclose_email_information: bool | None
    collaboration_memberships_count: int
    organisation: OrganisationDetailDTO
    collaboration_memberships: list[CollaborationMembershipDTO]
    groups: list[GroupDetailDTO]
    services: list[ServiceDetailDTO]
    invitations: list[InvitationDTO]
    join_requests: list[JoinRequestDTO]
    service_connection_requests: list[ServiceConnectionRequestDTO]
    tags: list[TagDTO]
    units: list[UnitDTO]


class CollaborationIdDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int


# The DTO's below describe the collaboration as shown to a user who is not a member yet: the one considering a join
# request and the one following an invitation. They only contain what those pages actually render.

class SanitizedUserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str | None
    email: str | None


class ServiceCardMembershipDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: SanitizedUserDTO


class ServiceCardDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # The service card looks up the groups of a service by uuid4
    uuid4: str
    name: str
    description: str | None
    logo: str | None
    uri: str | None
    uri_info: str | None
    privacy_policy: str | None
    accepted_user_policy: str | None
    contact_email: str | None
    support_email: str | None
    organisation_name: str | None
    token_enabled: bool | None
    service_memberships: list[ServiceCardMembershipDTO]


class OrganisationSummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo: str | None
    accepted_user_policy: str | None
    schac_home_organisations: list[SchacHomeOrganisationDTO]


class GroupIdDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Only the number of groups is shown, so the group itself is not disclosed
    id: int


class CollaborationJoinRequestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    logo: str | None
    organisation_id: int
    collaboration_memberships_count: int
    organisation: OrganisationSummaryDTO
    groups: list[GroupIdDTO]
    services: list[ServiceCardDTO]
    disable_join_requests: bool | None
    disclose_member_information: bool | None


# The DTO's below describe what an invitee sees, which does list the members, but only the name and the email of the
# users behind them.

class SanitizedCollaborationMembershipDTO(CollaborationMembershipDTO):
    user: SanitizedUserDTO


class InvitationCollaborationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    logo: str | None
    organisation_id: int
    collaboration_memberships_count: int
    organisation: OrganisationSummaryDTO
    groups: list[GroupIdDTO]
    services: list[ServiceCardDTO]
    short_name: str
    website_url: str | None
    support_email: str | None
    collaboration_memberships: list[SanitizedCollaborationMembershipDTO]
    tags: list[TagDTO]


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
