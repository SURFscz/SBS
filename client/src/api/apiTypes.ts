/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

export interface CollaborationDTO {
  id: number;
  name: string;
  description: string;
  short_name: string;
  logo: string | null;
  website_url: string | null;
  support_email: string | null;
  organisation_id: number;
  status: string;
  expiry_date: number | null;
  last_activity_date: number;
  disclose_member_information: boolean | null;
  disclose_email_information: boolean | null;
  collaboration_memberships_count: number;
  organisation: OrganisationDTO;
  collaboration_memberships: CollaborationMembershipDTO[];
  groups: GroupDTO[];
  services: ServiceDTO[];
}
export interface OrganisationDTO {
  id: number;
  name: string;
  short_name: string;
  logo: string | null;
  accepted_user_policy: string | null;
  schac_home_organisations: SchacHomeOrganisationDTO[];
}
export interface SchacHomeOrganisationDTO {
  name: string;
}
export interface CollaborationMembershipDTO {
  id: number;
  user_id: number;
  role: string;
  status: string;
  expiry_date: number | null;
  created_at: number;
  user: UserDTO;
}
export interface UserDTO {
  id: number;
  name: string | null;
  email: string | null;
  username: string | null;
  schac_home_organisation: string | null;
}
export interface GroupDTO {
  id: number;
  name: string;
  description: string | null;
  short_name: string;
  identifier: string;
  global_urn: string;
  auto_provision_members: boolean | null;
  created_at: number;
  service_group_id: number | null;
  collaboration_memberships: CollaborationMembershipDTO[];
}
export interface ServiceDTO {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  uri: string | null;
  uri_info: string | null;
  privacy_policy: string | null;
  accepted_user_policy: string | null;
  contact_email: string | null;
  support_email: string | null;
  token_enabled: boolean | null;
  token_validity_days: number | null;
  organisation_name: string | null;
  service_memberships: ServiceMembershipDTO[];
}
export interface ServiceMembershipDTO {
  user: UserDTO;
}
export interface CollaborationDetailDTO {
  id: number;
  identifier: string;
  name: string;
  description: string;
  short_name: string;
  logo: string | null;
  website_url: string | null;
  support_email: string | null;
  organisation_id: number;
  status: string;
  expiry_date: number | null;
  last_activity_date: number;
  disable_join_requests: boolean | null;
  disclose_member_information: boolean | null;
  disclose_email_information: boolean | null;
  collaboration_memberships_count: number;
  organisation: OrganisationDetailDTO;
  collaboration_memberships: CollaborationMembershipDTO[];
  groups: GroupDetailDTO[];
  services: ServiceDetailDTO[];
  invitations: InvitationDTO[];
  join_requests: JoinRequestDTO[];
  service_connection_requests: ServiceConnectionRequestDTO[];
  tags: TagDTO[];
  units: UnitDTO[];
}
export interface OrganisationDetailDTO {
  id: number;
  name: string;
  short_name: string;
  logo: string | null;
  accepted_user_policy: string | null;
  schac_home_organisations: SchacHomeOrganisationDTO[];
  services_restricted: boolean | null;
  service_connection_requires_approval: boolean | null;
  invitation_message: string | null;
  invitation_sender_name: string | null;
  units: UnitDTO[];
}
export interface UnitDTO {
  id: number;
  name: string;
}
export interface GroupDetailDTO {
  id: number;
  name: string;
  description: string | null;
  short_name: string;
  identifier: string;
  global_urn: string;
  auto_provision_members: boolean | null;
  created_at: number;
  service_group_id: number | null;
  collaboration_memberships: CollaborationMembershipDTO[];
  service_group: ServiceGroupDTO | null;
}
export interface ServiceGroupDTO {
  service_id: number;
  service: ServiceGroupServiceDTO;
}
export interface ServiceGroupServiceDTO {
  id: number;
  name: string;
}
export interface ServiceDetailDTO {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  uri: string | null;
  uri_info: string | null;
  privacy_policy: string | null;
  accepted_user_policy: string | null;
  contact_email: string | null;
  support_email: string | null;
  token_enabled: boolean | null;
  token_validity_days: number | null;
  organisation_name: string | null;
  service_memberships: ServiceMembershipDTO[];
  uuid4: string;
}
export interface InvitationDTO {
  id: number;
  invitee_email: string;
  intended_role: string;
  status: string;
  expiry_date: number | null;
  created_at: number;
  created_by: string;
  user: UserDTO | null;
}
export interface JoinRequestDTO {
  id: number;
  hash: string | null;
  status: string;
  message: string | null;
  rejection_reason: string | null;
  created_at: number;
  user: UserDTO;
}
export interface ServiceConnectionRequestDTO {
  id: number;
  status: string;
  created_at: number;
  service: ServiceDetailDTO;
  requester: RequesterDTO;
}
export interface RequesterDTO {
  name: string | null;
  uid: string;
}
export interface TagDTO {
  id: number;
  tag_value: string;
}
