from pydantic import BaseModel, ConfigDict
import datetime

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
    expiry_date: datetime.datetime | None
    created_at: datetime.datetime
    user: UserDTO

class GroupDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    short_name: str | None
    identifier: str
    global_urn: str | None
    auto_provision_members: bool | None
    created_at: datetime.datetime
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
    logo: str
    accepted_user_policy: str
    schac_home_organisations: list[SchacHomeOrganisationDTO]

class CollaborationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    short_name: str
    logo: str
    website_url: str | None
    support_email: str | None
    organisation_id: int
    status: str
    expiry_date: str | None
    last_activity_date: datetime.datetime
    disclose_member_information: bool
    disclose_email_information: bool
    collaboration_memberships_count: int
    organisation: OrganisationDTO
    collaboration_memberships: list[CollaborationMembershipDTO]
    groups: list[GroupDTO]
    services: list[ServiceDTO]

