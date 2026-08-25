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
  logo: string;
  website_url: string | null;
  support_email: string | null;
  organisation_id: number;
  status: string;
  expiry_date: string | null;
  last_activity_date: string;
  disclose_member_information: boolean;
  disclose_email_information: boolean;
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
  logo: string;
  accepted_user_policy: string;
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
  expiry_date: string | null;
  created_at: string;
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
  description: string;
  short_name: string | null;
  identifier: string;
  global_urn: string | null;
  auto_provision_members: boolean | null;
  created_at: string;
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
