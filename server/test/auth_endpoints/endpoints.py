from enum import Enum


class Roles(Enum):
    APPLICATION_PLATFORM = 1
    ORGANISATION_ADMIN = 2
    ORGANISATION_MANAGER = 3
    COLLABORATION_ADMIN = 4
    COLLABORATION_MEMBER = 5
    SERVICE_ADMIN = 6
    SERVICE_MANAGER = 7

    def lower_authority_roles(self):
        return [r for r in list(Roles) if r.value > self.value]


endpoints = [
    {
        "name": "api_key_api.delete_api_key",
        "method": "DELETE",
        "path": "/api/api_keys/<api_key_id>"
    },
    {
        "name": "api_key_api.generate_key",
        "method": "GET",
        "path": "/api/api_keys/"
    },
    {
        "name": "api_key_api.save_api_key",
        "method": "POST",
        "path": "/api/api_keys/"
    },
    {
        "name": "api_tag.all_organisation_tags",
        "method": "GET",
        "path": "/api/tags/",
        "query_data": {"organisation_id": 0},
        # "access_role": Roles.ORGANISATION_MANAGER,
    },
    {
        "name": "api_tag.all_tags",
        "method": "GET",
        "path": "/api/tags/all",
        "access_role": Roles.APPLICATION_PLATFORM
    },
    {
        "name": "api_tag.delete_tag",
        "method": "DELETE",
        "path": "/api/tags/<organisation_id>/<id>"
    },
    {
        "name": "api_tag.orphan_tags",
        "method": "GET",
        "path": "/api/tags/orphans"
    },
    {
        "name": "api_unit.usages",
        "method": "GET",
        "path": "/api/units/usages/<organisation_id>/<unit_id>"
    },
    {
        "name": "audit_log_api.activity",
        "method": "GET",
        "path": "/api/audit_logs/activity"
    },
    {
        "name": "audit_log_api.info",
        "method": "GET",
        "path": "/api/audit_logs/info/<query_id>/<collection_name>"
    },
    {
        "name": "audit_log_api.me",
        "method": "GET",
        "path": "/api/audit_logs/me"
    },
    {
        "name": "audit_log_api.other",
        "method": "GET",
        "path": "/api/audit_logs/other/<user_id>"
    },
    {
        "name": "aup_api.agreed_aup",
        "method": "POST",
        "path": "/api/aup/agree"
    },
    {
        "name": "aup_api.links",
        "method": "GET",
        "path": "/api/aup/info",
        "status_code": 200
    },
    {
        "name": "base_api.config",
        "method": "GET",
        "path": "/config",
        "status_code": 200
    },
    {
        "name": "base_api.health",
        "method": "GET",
        "path": "/health",
        "status_code": 200
    },
    {
        "name": "base_api.info",
        "method": "GET",
        "path": "/info",
        "status_code": 200
    },
    {
        "name": "collaboration_api.activate",
        "method": "PUT",
        "path": "/api/collaborations/activate"
    },
    {
        "name": "collaboration_api.api_collaboration_by_identifier",
        "method": "GET",
        "path": "/api/collaborations/v1/<co_identifier>"
    },
    {
        "name": "collaboration_api.api_delete_user_from_collaboration",
        "method": "DELETE",
        "path": "/api/collaborations/v1/<co_identifier>/members/<user_uid>"
    },
    {
        "name": "collaboration_api.api_update_user_from_collaboration",
        "method": "PUT",
        "path": "/api/collaborations/v1/<co_identifier>/members"
    },
    {
        "name": "collaboration_api.collaboration_access_allowed",
        "method": "GET",
        "path": "/api/collaborations/access_allowed/<collaboration_id>"
    },
    {
        "name": "collaboration_api.collaboration_admins",
        "method": "GET",
        "path": "/api/collaborations/admins/<service_id>"
    },
    {
        "name": "collaboration_api.collaboration_all",
        "method": "GET",
        "path": "/api/collaborations/all"
    },
    {
        "name": "collaboration_api.collaboration_all_optimized",
        "method": "GET",
        "path": "/api/collaborations/all_optimized"
    },
    {
        "name": "collaboration_api.collaboration_by_id",
        "method": "GET",
        "path": "/api/collaborations/<collaboration_id>"
    },
    {
        "name": "collaboration_api.collaboration_by_identifier",
        "method": "GET",
        "path": "/api/collaborations/find_by_identifier"
    },
    {
        "name": "collaboration_api.collaboration_invites",
        "method": "PUT",
        "path": "/api/collaborations/invites"
    },
    {
        "name": "collaboration_api.collaboration_invites_preview",
        "method": "POST",
        "path": "/api/collaborations/invites-preview"
    },
    {
        "name": "collaboration_api.collaboration_lite_by_id",
        "method": "GET",
        "path": "/api/collaborations/lite/<collaboration_id>"
    },
    {
        "name": "collaboration_api.collaboration_mine_optimized",
        "method": "GET",
        "path": "/api/collaborations/mine_optimized"
    },
    {
        "name": "collaboration_api.collaboration_search",
        "method": "GET",
        "path": "/api/collaborations/search"
    },
    {
        "name": "collaboration_api.delete_collaboration",
        "method": "DELETE",
        "path": "/api/collaborations/<collaboration_id>"
    },
    {
        "name": "collaboration_api.delete_collaboration_api",
        "method": "DELETE",
        "path": "/api/collaborations/v1/<co_identifier>"
    },
    {
        "name": "collaboration_api.hint_short_name",
        "method": "POST",
        "path": "/api/collaborations/hint_short_name"
    },
    {
        "name": "collaboration_api.id_by_identifier",
        "method": "GET",
        "path": "/api/collaborations/id_by_identifier"
    },
    {
        "name": "collaboration_api.may_request_collaboration",
        "method": "GET",
        "path": "/api/collaborations/may_request_collaboration"
    },
    {
        "name": "collaboration_api.members",
        "method": "GET",
        "path": "/api/collaborations/members"
    },
    {
        "name": "collaboration_api.name_exists",
        "method": "GET",
        "path": "/api/collaborations/name_exists"
    },
    {
        "name": "collaboration_api.save_collaboration",
        "method": "POST",
        "path": "/api/collaborations/"
    },
    {
        "name": "collaboration_api.save_collaboration_api",
        "method": "POST",
        "path": "/api/collaborations/v1"
    },
    {
        "name": "collaboration_api.short_name_exists",
        "method": "GET",
        "path": "/api/collaborations/short_name_exists"
    },
    {
        "name": "collaboration_api.unsuspend",
        "method": "PUT",
        "path": "/api/collaborations/unsuspend"
    },
    {
        "name": "collaboration_api.update_collaboration",
        "method": "PUT",
        "path": "/api/collaborations/"
    },
    {
        "name": "collaboration_membership_api.create_collaboration_membership_role",
        "method": "POST",
        "path": "/api/collaboration_memberships/"
    },
    {
        "name": "collaboration_membership_api.delete_collaboration_membership",
        "method": "DELETE",
        "path": "/api/collaboration_memberships/<int:collaboration_id>/<int:user_id>"
    },
    {
        "name": "collaboration_membership_api.update_collaboration_membership_expiry_date",
        "method": "PUT",
        "path": "/api/collaboration_memberships/expiry"
    },
    {
        "name": "collaboration_membership_api.update_collaboration_membership_role",
        "method": "PUT",
        "path": "/api/collaboration_memberships/"
    },
    {
        "name": "collaboration_request_api.approve_request",
        "method": "PUT",
        "path": "/api/collaboration_requests/approve/<collaboration_request_id>"
    },
    {
        "name": "collaboration_request_api.collaboration_request_by_id",
        "method": "GET",
        "path": "/api/collaboration_requests/<collaboration_request_id>"
    },
    {
        "name": "collaboration_request_api.delete_request_collaboration",
        "method": "DELETE",
        "path": "/api/collaboration_requests/<collaboration_request_id>"
    },
    {
        "name": "collaboration_request_api.deny_request",
        "method": "PUT",
        "path": "/api/collaboration_requests/deny/<collaboration_request_id>"
    },
    {
        "name": "collaboration_request_api.request_collaboration",
        "method": "POST",
        "path": "/api/collaboration_requests/"
    },
    {
        "name": "collaborations_services_api.add_collaborations_services",
        "method": "PUT",
        "path": "/api/collaborations_services/",
        "body": {"collaboration_id": 0}
    },
    {
        "name": "collaborations_services_api.connect_collaboration_service_api",
        "method": "PUT",
        "path": "/api/collaborations_services/v1/connect_collaboration_service"
    },
    {
        "name": "collaborations_services_api.delete_collaborations_services",
        "method": "DELETE",
        "path": "/api/collaborations_services/<int:collaboration_id>/<int:service_id>"
    },
    {
        "name": "collaborations_services_api.disconnect_collaboration_service_api",
        "method": "PUT",
        "path": "/api/collaborations_services/v1/disconnect_collaboration_service"
    },
    {
        "name": "flasgger.<lambda>",
        "method": "GET",
        "path": "/apidocs/index.html",
        "status_code": 302
    },
    {
        "name": "flasgger.apidocs",
        "method": "GET",
        "path": "/apidocs/",
        "status_code": 200
    },
    {
        "name": "flasgger.apispec",
        "method": "GET",
        "path": "/swagger_api/apispec.json",
        "status_code": 200
    },
    {
        "name": "flasgger.oauth_redirect",
        "method": "GET",
        "path": "/oauth2-redirect.html",
        "status_code": 200
    },
    {
        "name": "flasgger.static",
        "method": "GET",
        "path": "/flasgger_static/<filename>",
        "status_code": 404
    },
    {
        "name": "group_api.api_add_group_membership",
        "method": "POST",
        "path": "/api/groups/v1/<group_identifier>"
    },
    {
        "name": "group_api.api_delete_group_membership",
        "method": "DELETE",
        "path": "/api/groups/v1/<group_identifier>/members/<user_uid>"
    },
    {
        "name": "group_api.create_group_api",
        "method": "POST",
        "path": "/api/groups/v1"
    },
    {
        "name": "group_api.delete_group",
        "method": "DELETE",
        "path": "/api/groups/<group_id>"
    },
    {
        "name": "group_api.delete_group_api",
        "method": "DELETE",
        "path": "/api/groups/v1/<group_identifier>"
    },
    {
        "name": "group_api.name_exists",
        "method": "GET",
        "path": "/api/groups/name_exists"
    },
    {
        "name": "group_api.save_group",
        "method": "POST",
        "path": "/api/groups/"
    },
    {
        "name": "group_api.short_name_exists",
        "method": "GET",
        "path": "/api/groups/short_name_exists"
    },
    {
        "name": "group_api.update_group",
        "method": "PUT",
        "path": "/api/groups/"
    },
    {
        "name": "group_api.update_group_api",
        "method": "PUT",
        "path": "/api/groups/v1/<group_identifier>"
    },
    {
        "name": "group_members_api.add_group_members",
        "method": "PUT",
        "path": "/api/group_members/"
    },
    {
        "name": "group_members_api.delete_group_members",
        "method": "DELETE",
        "path": "/api/group_members/<group_id>/<collaboration_membership_id>/<collaboration_id>"
    },
    {
        "name": "image_api.get_logo",
        "method": "GET",
        "path": "/api/images/<object_type>/<sid>",
        "status_code": 400
    },
    {
        "name": "invitations_api.collaboration_invites_api",
        "method": "PUT",
        "path": "/api/invitations/v1/collaboration_invites"
    },
    {
        "name": "invitations_api.delete_by_hash",
        "method": "DELETE",
        "path": "/api/invitations/delete_by_hash/<hash>"
    },
    {
        "name": "invitations_api.delete_external_invitation",
        "method": "DELETE",
        "path": "/api/invitations/v1/<external_identifier>"
    },
    {
        "name": "invitations_api.delete_invitation",
        "method": "DELETE",
        "path": "/api/invitations/<invitation_id>"
    },
    {
        "name": "invitations_api.external_invitation",
        "method": "GET",
        "path": "/api/invitations/v1/<external_identifier>"
    },
    {
        "name": "invitations_api.get_open_invitations",
        "method": "GET",
        "path": "/api/invitations/v1/invitations/<co_identifier>"
    },
    {
        "name": "invitations_api.invitation_exists_by_email",
        "method": "POST",
        "path": "/api/invitations/exists_email"
    },
    {
        "name": "invitations_api.invitations_accept",
        "method": "PUT",
        "path": "/api/invitations/accept"
    },
    {
        "name": "invitations_api.invitations_by_hash",
        "method": "GET",
        "path": "/api/invitations/find_by_hash",
        "status_code": 404,
        "query_data": {"hash": "nope"}
    },
    {
        "name": "invitations_api.invitations_decline",
        "method": "PUT",
        "path": "/api/invitations/decline"
    },
    {
        "name": "invitations_api.invitations_resend",
        "method": "PUT",
        "path": "/api/invitations/resend"
    },
    {
        "name": "invitations_api.invitations_resend_bulk",
        "method": "PUT",
        "path": "/api/invitations/resend_bulk"
    },
    {
        "name": "join_request_api.already_member",
        "method": "POST",
        "path": "/api/join_requests/already-member"
    },
    {
        "name": "join_request_api.approve_join_request",
        "method": "PUT",
        "path": "/api/join_requests/accept"
    },
    {
        "name": "join_request_api.delete_join_request",
        "method": "DELETE",
        "path": "/api/join_requests/<join_request_id>"
    },
    {
        "name": "join_request_api.deny_join_request",
        "method": "PUT",
        "path": "/api/join_requests/decline"
    },
    {
        "name": "join_request_api.new_join_request",
        "method": "POST",
        "path": "/api/join_requests/"
    },
    {
        "name": "mfa_api.get2fa",
        "method": "GET",
        "path": "/api/mfa/get2fa"
    },
    {
        "name": "mfa_api.pre_update2fa",
        "method": "POST",
        "path": "/api/mfa/pre-update2fa"
    },
    {
        "name": "mfa_api.reset2fa",
        "method": "POST",
        "path": "/api/mfa/reset2fa"
    },
    {
        "name": "mfa_api.reset2fa_other",
        "method": "PUT",
        "path": "/api/mfa/reset2fa_other"
    },
    {
        "name": "mfa_api.token_reset_request",
        "method": "GET",
        "path": "/api/mfa/token_reset_request"
    },
    {
        "name": "mfa_api.token_reset_request_post",
        "method": "POST",
        "path": "/api/mfa/token_reset_request"
    },
    {
        "name": "mfa_api.update2fa",
        "method": "POST",
        "path": "/api/mfa/update2fa"
    },
    {
        "name": "mfa_api.verify2fa",
        "method": "POST",
        "path": "/api/mfa/verify2fa"
    },
    {
        "name": "mock_user_api.login_user",
        "method": "PUT",
        "path": "/api/mock/"
    },
    {
        "name": "organisation_api.api_organisation_details",
        "method": "GET",
        "path": "/api/organisations/v1"
    },
    {
        "name": "organisation_api.delete_organisation",
        "method": "DELETE",
        "path": "/api/organisations/<organisation_id>"
    },
    {
        "name": "organisation_api.find_crm_organisations",
        "method": "GET",
        "path": "/api/organisations/crm_organisations"
    },
    {
        "name": "organisation_api.find_org_names",
        "method": "POST",
        "path": "/api/organisations/names"
    },
    {
        "name": "organisation_api.find_schac_home",
        "method": "GET",
        "path": "/api/organisations/schac_home/<organisation_id>"
    },
    {
        "name": "organisation_api.find_schac_homes",
        "method": "POST",
        "path": "/api/organisations/schac_homes"
    },
    {
        "name": "organisation_api.identity_provider_display_name",
        "method": "GET",
        "path": "/api/organisations/identity_provider_display_name"
    },
    {
        "name": "organisation_api.my_organisations",
        "method": "GET",
        "path": "/api/organisations/"
    },
    {
        "name": "organisation_api.my_organisations_lite",
        "method": "GET",
        "path": "/api/organisations/mine_lite"
    },
    {
        "name": "organisation_api.name_exists",
        "method": "GET",
        "path": "/api/organisations/name_exists"
    },
    {
        "name": "organisation_api.organisation_all",
        "method": "GET",
        "path": "/api/organisations/all"
    },
    {
        "name": "organisation_api.organisation_by_id",
        "method": "GET",
        "path": "/api/organisations/<organisation_id>"
    },
    {
        "name": "organisation_api.organisation_by_schac_home",
        "method": "GET",
        "path": "/api/organisations/find_by_schac_home_organisation"
    },
    {
        "name": "organisation_api.organisation_invites",
        "method": "PUT",
        "path": "/api/organisations/invites"
    },
    {
        "name": "organisation_api.organisation_invites_preview",
        "method": "POST",
        "path": "/api/organisations/invites-preview"
    },
    {
        "name": "organisation_api.organisation_name_by_id",
        "method": "GET",
        "path": "/api/organisations/name_by_id/<organisation_id>"
    },
    {
        "name": "organisation_api.organisation_search",
        "method": "GET",
        "path": "/api/organisations/search"
    },
    {
        "name": "organisation_api.save_organisation",
        "method": "POST",
        "path": "/api/organisations/"
    },
    {
        "name": "organisation_api.schac_home_exists",
        "method": "GET",
        "path": "/api/organisations/schac_home_exists"
    },
    {
        "name": "organisation_api.search_invites",
        "method": "GET",
        "path": "/api/organisations/<organisation_id>/invites"
    },
    {
        "name": "organisation_api.search_users",
        "method": "GET",
        "path": "/api/organisations/<organisation_id>/users"
    },
    {
        "name": "organisation_api.short_name_exists",
        "method": "GET",
        "path": "/api/organisations/short_name_exists"
    },
    {
        "name": "organisation_api.update_organisation",
        "method": "PUT",
        "path": "/api/organisations/"
    },
    {
        "name": "organisation_invitations_api.delete_organisation_invitation",
        "method": "DELETE",
        "path": "/api/organisation_invitations/<id>"
    },
    {
        "name": "organisation_invitations_api.invitation_exists_by_email",
        "method": "POST",
        "path": "/api/organisation_invitations/exists_email"
    },
    {
        "name": "organisation_invitations_api.invitations_resend_bulk",
        "method": "PUT",
        "path": "/api/organisation_invitations/resend_bulk"
    },
    {
        "name": "organisation_invitations_api.organisation_invitations_accept",
        "method": "PUT",
        "path": "/api/organisation_invitations/accept"
    },
    {
        "name": "organisation_invitations_api.organisation_invitations_by_hash",
        "method": "GET",
        "path": "/api/organisation_invitations/find_by_hash",
        "status_code": 404,
        "query_data": {"hash": "nope"}
    },
    {
        "name": "organisation_invitations_api.organisation_invitations_decline",
        "method": "PUT",
        "path": "/api/organisation_invitations/decline"
    },
    {
        "name": "organisation_invitations_api.organisation_invitations_resend",
        "method": "PUT",
        "path": "/api/organisation_invitations/resend"
    },
    {
        "name": "organisation_membership_api.delete_organisation_membership",
        "method": "DELETE",
        "path": "/api/organisation_memberships/<organisation_id>/<user_id>"
    },
    {
        "name": "organisation_membership_api.update_organisation_membership_role",
        "method": "PUT",
        "path": "/api/organisation_memberships/"
    },
    {
        "name": "pam_weblogin_api.check_pin",
        "method": "POST",
        "path": "/pam-weblogin/check-pin"
    },
    {
        "name": "pam_weblogin_api.find_by_session_id",
        "method": "GET",
        "path": "/pam-weblogin/<service_shortname>/<session_id>",
        "status_code": 404
    },
    {
        "name": "pam_weblogin_api.ssh_keys",
        "method": "GET",
        "path": "/pam-weblogin/ssh_keys"
    },
    {
        "name": "pam_weblogin_api.start",
        "method": "POST",
        "path": "/pam-weblogin/start"
    },
    {
        "name": "pam_weblogin_api.success_by_session_id",
        "method": "GET",
        "path": "/pam-weblogin/status/success/<session_id>",
        "status_code": 200
    },
    {
        "name": "plsc_api.sync",
        "method": "GET",
        "path": "/api/plsc/sync"
    },
    {
        "name": "plsc_api.syncing",
        "method": "GET",
        "path": "/api/plsc/syncing"
    },
    {
        "name": "scim_api.resource_types",
        "method": "GET",
        "path": "/api/scim/v2/ResourceTypes",
        "status_code": 200
    },
    {
        "name": "scim_api.resource_types_group",
        "method": "GET",
        "path": "/api/scim/v2/ResourceTypes/Group",
        "status_code": 200
    },
    {
        "name": "scim_api.resource_types_user",
        "method": "GET",
        "path": "/api/scim/v2/ResourceTypes/User",
        "status_code": 200
    },
    {
        "name": "scim_api.schema_core_group",
        "method": "GET",
        "path": "/api/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group",
        "status_code": 200
    },
    {
        "name": "scim_api.schema_core_user",
        "method": "GET",
        "path": "/api/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User",
        "status_code": 200
    },
    {
        "name": "scim_api.schema_sram_group",
        "method": "GET",
        "path": "/api/scim/v2/Schemas/urn:mace:surf.nl:sram:scim:extension:Group",
        "status_code": 200
    },
    {
        "name": "scim_api.schema_sram_user",
        "method": "GET",
        "path": "/api/scim/v2/Schemas/urn:mace:surf.nl:sram:scim:extension:User",
        "status_code": 200
    },
    {
        "name": "scim_api.schemas",
        "method": "GET",
        "path": "/api/scim/v2/Schemas",
        "status_code": 200
    },
    {
        "name": "scim_api.scim_service",
        "method": "GET",
        "path": "/api/scim/v2/scim-services",
        "status_code": 403
    },
    {
        "name": "scim_api.service_group_by_identifier",
        "method": "GET",
        "path": "/api/scim/v2/Groups/<group_external_id>"
    },
    {
        "name": "scim_api.service_groups",
        "method": "GET",
        "path": "/api/scim/v2/Groups"
    },
    {
        "name": "scim_api.service_user_by_external_id",
        "method": "GET",
        "path": "/api/scim/v2/Users/<user_external_id>"
    },
    {
        "name": "scim_api.service_users",
        "method": "GET",
        "path": "/api/scim/v2/Users"
    },
    {
        "name": "scim_api.sweep",
        "method": "PUT",
        "path": "/api/scim/v2/sweep",
        "status_code": 403,
        "body": {"service_id": 0}
    },
    {
        "name": "scim_mock_api.clear",
        "method": "DELETE",
        "path": "/api/scim_mock/clear",
        "status_code": 403
    },
    {
        "name": "scim_mock_api.delete_group",
        "method": "DELETE",
        "path": "/api/scim_mock/Groups/<scim_id>"
    },
    {
        "name": "scim_mock_api.delete_user",
        "method": "DELETE",
        "path": "/api/scim_mock/Users/<scim_id>"
    },
    {
        "name": "scim_mock_api.find_group",
        "method": "GET",
        "path": "/api/scim_mock/Groups"
    },
    {
        "name": "scim_mock_api.find_user",
        "method": "GET",
        "path": "/api/scim_mock/Users"
    },
    {
        "name": "scim_mock_api.new_group",
        "method": "POST",
        "path": "/api/scim_mock/Groups"
    },
    {
        "name": "scim_mock_api.new_user",
        "method": "POST",
        "path": "/api/scim_mock/Users"
    },
    {
        "name": "scim_mock_api.statistics",
        "method": "GET",
        "path": "/api/scim_mock/statistics",
        "status_code": 403
    },
    {
        "name": "scim_mock_api.update_group",
        "method": "PUT",
        "path": "/api/scim_mock/Groups/<scim_id>"
    },
    {
        "name": "scim_mock_api.update_user",
        "method": "PUT",
        "path": "/api/scim_mock/Users/<scim_id>"
    },
    {
        "name": "service_api.abbreviation_exists",
        "method": "GET",
        "path": "/api/services/abbreviation_exists"
    },
    {
        "name": "service_api.all_optimized_services",
        "method": "GET",
        "path": "/api/services/all_optimized"
    },
    {
        "name": "service_api.all_services",
        "method": "GET",
        "path": "/api/services/all"
    },
    {
        "name": "service_api.delete_service",
        "method": "DELETE",
        "path": "/api/services/<service_id>"
    },
    {
        "name": "service_api.disallow_organisation",
        "method": "PUT",
        "path": "/api/services/disallow_organisation/<service_id>/<organisation_id>"
    },
    {
        "name": "service_api.entity_id_exists",
        "method": "GET",
        "path": "/api/services/entity_id_exists"
    },
    {
        "name": "service_api.has_member_access_to_service",
        "method": "GET",
        "path": "/api/services/member_access_to_service/<service_id>"
    },
    {
        "name": "service_api.hint_short_name",
        "method": "POST",
        "path": "/api/services/hint_short_name"
    },
    {
        "name": "service_api.ldap_identifier",
        "method": "GET",
        "path": "/api/services/ldap_identifier"
    },
    {
        "name": "service_api.mine_optimized_services",
        "method": "GET",
        "path": "/api/services/mine_optimized"
    },
    {
        "name": "service_api.mine_services",
        "method": "GET",
        "path": "/api/services/mine"
    },
    {
        "name": "service_api.name_exists",
        "method": "GET",
        "path": "/api/services/name_exists"
    },
    {
        "name": "service_api.on_request_organisation",
        "method": "PUT",
        "path": "/api/services/on_request_organisation/<service_id>/<organisation_id>"
    },
    {
        "name": "service_api.request_delete_service",
        "method": "DELETE",
        "path": "/api/services/request_delete/<service_id>"
    },
    {
        "name": "service_api.reset_ldap_password",
        "method": "GET",
        "path": "/api/services/reset_ldap_password/<service_id>"
    },
    {
        "name": "service_api.reset_oidc_client_secret",
        "method": "GET",
        "path": "/api/services/reset_oidc_client_secret/<service_id>"
    },
    {
        "name": "service_api.reset_scim_bearer_token",
        "method": "PUT",
        "path": "/api/services/reset_scim_bearer_token/<service_id>"
    },
    {
        "name": "service_api.save_service",
        "method": "POST",
        "path": "/api/services/"
    },
    {
        "name": "service_api.service_by_entity_id",
        "method": "GET",
        "path": "/api/services/find_by_entity_id"
    },
    {
        "name": "service_api.service_by_id",
        "method": "GET",
        "path": "/api/services/<service_id>"
    },
    {
        "name": "service_api.service_by_uuid4",
        "method": "GET",
        "path": "/api/services/find_by_uuid4"
    },
    {
        "name": "service_api.service_invites",
        "method": "PUT",
        "path": "/api/services/invites"
    },
    {
        "name": "service_api.toggle_access_property",
        "method": "PUT",
        "path": "/api/services/toggle_access_property/<service_id>"
    },
    {
        "name": "service_api.trust_organisation",
        "method": "PUT",
        "path": "/api/services/trust_organisation/<service_id>/<organisation_id>"
    },
    {
        "name": "service_api.update_service",
        "method": "PUT",
        "path": "/api/services/"
    },
    {
        "name": "service_api.user_services",
        "method": "GET",
        "path": "/api/services/v1/access/<user_id>"
    },
    {
        "name": "service_aups_api.create_bulk_service_aup",
        "method": "POST",
        "path": "/api/service_aups/bulk"
    },
    {
        "name": "service_aups_api.create_service_aup",
        "method": "POST",
        "path": "/api/service_aups/"
    },
    {
        "name": "service_aups_api.delete_all",
        "method": "PUT",
        "path": "/api/service_aups/delete_by_service"
    },
    {
        "name": "service_connection_request_api.all_service_request_connections_by_service",
        "method": "GET",
        "path": "/api/service_connection_requests/all/<service_id>"
    },
    {
        "name": "service_connection_request_api.approve_service_connection_request",
        "method": "PUT",
        "path": "/api/service_connection_requests/approve"
    },
    {
        "name": "service_connection_request_api.delete_service_request_connection",
        "method": "DELETE",
        "path": "/api/service_connection_requests/<service_connection_request_id>"
    },
    {
        "name": "service_connection_request_api.deny_service_connection_request",
        "method": "PUT",
        "path": "/api/service_connection_requests/deny"
    },
    {
        "name": "service_connection_request_api.request_service_connection",
        "method": "POST",
        "path": "/api/service_connection_requests/"
    },
    {
        "name": "service_connection_request_api.service_request_connections_by_service",
        "method": "GET",
        "path": "/api/service_connection_requests/by_service/<service_id>"
    },
    {
        "name": "service_group_api.delete_service_group",
        "method": "DELETE",
        "path": "/api/servicegroups/<service_group_id>"
    },
    {
        "name": "service_group_api.save_service_group",
        "method": "POST",
        "path": "/api/servicegroups/"
    },
    {
        "name": "service_group_api.find_by_service_uuid",
        "method": "GET",
        "path": "/api/servicegroups/find_by_service_uuid/<service_uuid4>"
    },
    {
        "name": "service_group_api.service_group_name_exists",
        "method": "GET",
        "path": "/api/servicegroups/name_exists"
    },
    {
        "name": "service_group_api.service_group_short_name_exists",
        "method": "GET",
        "path": "/api/servicegroups/short_name_exists"
    },
    {
        "name": "service_group_api.update_service_group",
        "method": "PUT",
        "path": "/api/servicegroups/"
    },
    {
        "name": "service_invitations_api.delete_service_invitation",
        "method": "DELETE",
        "path": "/api/service_invitations/<id>"
    },
    {
        "name": "service_invitations_api.invitation_exists_by_email",
        "method": "POST",
        "path": "/api/service_invitations/exists_email"
    },
    {
        "name": "service_invitations_api.invitations_resend_bulk",
        "method": "PUT",
        "path": "/api/service_invitations/resend_bulk"
    },
    {
        "name": "service_invitations_api.service_invitations_accept",
        "method": "PUT",
        "path": "/api/service_invitations/accept"
    },
    {
        "name": "service_invitations_api.service_invitations_by_hash",
        "method": "GET",
        "path": "/api/service_invitations/find_by_hash",
        "query_data": {"hash": "nope"},
        "status_code": 404
    },
    {
        "name": "service_invitations_api.service_invitations_decline",
        "method": "PUT",
        "path": "/api/service_invitations/decline"
    },
    {
        "name": "service_invitations_api.service_invitations_resend",
        "method": "PUT",
        "path": "/api/service_invitations/resend"
    },
    {
        "name": "service_membership_api.create_service_membership_role",
        "method": "POST",
        "path": "/api/service_memberships/"
    },
    {
        "name": "service_membership_api.delete_service_membership",
        "method": "DELETE",
        "path": "/api/service_memberships/<service_id>/<user_id>"
    },
    {
        "name": "service_membership_api.update_service_membership_role",
        "method": "PUT",
        "path": "/api/service_memberships/"
    },
    {
        "name": "service_request_api.approve_request",
        "method": "PUT",
        "path": "/api/service_requests/approve/<service_request_id>"
    },
    {
        "name": "service_request_api.delete_request_service",
        "method": "DELETE",
        "path": "/api/service_requests/<service_request_id>"
    },
    {
        "name": "service_request_api.deny_request",
        "method": "PUT",
        "path": "/api/service_requests/deny/<service_request_id>"
    },
    {
        "name": "service_request_api.generate_oidc_client_secret",
        "method": "GET",
        "path": "/api/service_requests/generate_oidc_client_secret"
    },
    {
        "name": "service_request_api.metadata_parse",
        "method": "POST",
        "path": "/api/service_requests/metadata/parse"
    },
    {
        "name": "service_request_api.request_service",
        "method": "POST",
        "path": "/api/service_requests/"
    },
    {
        "name": "service_request_api.service_request_all",
        "method": "GET",
        "path": "/api/service_requests/all"
    },
    {
        "name": "service_request_api.service_request_id_by_id",
        "method": "GET",
        "path": "/api/service_requests/<service_request_id>"
    },
    {
        "name": "service_token_api.delete_service_token",
        "method": "DELETE",
        "path": "/api/service_tokens/<service_token_id>"
    },
    {
        "name": "service_token_api.generate_service_token",
        "method": "GET",
        "path": "/api/service_tokens/"
    },
    {
        "name": "service_token_api.save_service_token",
        "method": "POST",
        "path": "/api/service_tokens/"
    },
    {
        "name": "static",
        "method": "GET",
        "path": "/static/<filename>",
        "status_code": 404
    },
    {
        "name": "swagger_specs.base_static",
        "method": "GET",
        "path": "/swagger/<filename>",
        "status_code": 404
    },
    {
        "name": "system_api.clean_slate",
        "method": "DELETE",
        "path": "/api/system/clean_slate"
    },
    {
        "name": "system_api.clear_audit_logs",
        "method": "DELETE",
        "path": "/api/system/clear-audit-logs"
    },
    {
        "name": "system_api.composition",
        "method": "GET",
        "path": "/api/system/composition"
    },
    {
        "name": "system_api.do_cleanup_non_open_requests",
        "method": "PUT",
        "path": "/api/system/cleanup_non_open_requests"
    },
    {
        "name": "system_api.do_db_stats",
        "method": "GET",
        "path": "/api/system/db_stats"
    },
    {
        "name": "system_api.do_expire_collaboration",
        "method": "PUT",
        "path": "/api/system/expire_collaborations"
    },
    {
        "name": "system_api.do_expire_memberships",
        "method": "PUT",
        "path": "/api/system/expire_memberships"
    },
    {
        "name": "system_api.do_invitation_expirations",
        "method": "PUT",
        "path": "/api/system/invitation_expirations"
    },
    {
        "name": "system_api.do_invitation_reminders",
        "method": "PUT",
        "path": "/api/system/invitation_reminders"
    },
    {
        "name": "system_api.do_open_requests",
        "method": "GET",
        "path": "/api/system/open_requests"
    },
    {
        "name": "system_api.do_orphan_users",
        "method": "PUT",
        "path": "/api/system/orphan_users"
    },
    {
        "name": "system_api.do_outstanding_requests",
        "method": "GET",
        "path": "/api/system/outstanding_requests"
    },
    {
        "name": "system_api.do_parse_metadata",
        "method": "GET",
        "path": "/api/system/parse_metadata"
    },
    {
        "name": "system_api.do_suspend_collaborations",
        "method": "PUT",
        "path": "/api/system/suspend_collaborations"
    },
    {
        "name": "system_api.do_suspend_users",
        "method": "PUT",
        "path": "/api/system/suspend_users"
    },
    {
        "name": "system_api.feedback",
        "method": "POST",
        "path": "/api/system/feedback"
    },
    {
        "name": "system_api.pam_services",
        "method": "GET",
        "path": "/api/system/pam-services"
    },
    {
        "name": "system_api.run_demo_seed",
        "method": "GET",
        "path": "/api/system/demo_seed"
    },
    {
        "name": "system_api.run_seed",
        "method": "GET",
        "path": "/api/system/seed"
    },
    {
        "name": "system_api.scheduled_jobs",
        "method": "GET",
        "path": "/api/system/scheduled_jobs"
    },
    {
        "name": "system_api.statistics",
        "method": "GET",
        "path": "/api/system/statistics"
    },
    {
        "name": "system_api.sweep",
        "method": "GET",
        "path": "/api/system/sweep"
    },
    {
        "name": "system_api.validations",
        "method": "GET",
        "path": "/api/system/validations"
    },
    {
        "name": "token_api.introspect",
        "method": "POST",
        "path": "/api/tokens/introspect"
    },
    {
        "name": "user_api.activate",
        "method": "PUT",
        "path": "/api/users/activate"
    },
    {
        "name": "user_api.attribute_aggregation",
        "method": "GET",
        "path": "/api/users/attribute_aggregation"
    },
    {
        "name": "user_api.authorization",
        "method": "GET",
        "path": "/api/users/authorization",
        "status_code": 200
    },
    {
        "name": "user_api.delete_other_user",
        "method": "DELETE",
        "path": "/api/users/delete_other/<user_id>"
    },
    {
        "name": "user_api.delete_user",
        "method": "DELETE",
        "path": "/api/users/"
    },
    {
        "name": "user_api.error",
        "method": "POST",
        "path": "/api/users/error"
    },
    {
        "name": "user_api.find_by_id",
        "method": "GET",
        "path": "/api/users/find_by_id"
    },
    {
        "name": "user_api.get_platform_admins",
        "method": "GET",
        "path": "/api/users/platform_admins"
    },
    {
        "name": "user_api.logout",
        "method": "GET",
        "path": "/api/users/logout",
        "status_code": 200
    },
    {
        "name": "user_api.me",
        "method": "GET",
        "path": "/api/users/me",
        "status_code": 200
    },
    {
        "name": "user_api.other",
        "method": "GET",
        "path": "/api/users/other"
    },
    {
        "name": "user_api.personal",
        "method": "GET",
        "path": "/api/users/personal"
    },
    {
        "name": "user_api.refresh",
        "method": "GET",
        "path": "/api/users/refresh"
    },
    {
        "name": "user_api.reset_totp_requested",
        "method": "GET",
        "path": "/api/users/reset_totp_requested"
    },
    {
        "name": "user_api.resume_session",
        "method": "GET",
        "path": "/api/users/resume-session",
        "status_code": 302
    },
    {
        "name": "user_api.service_info",
        "method": "GET",
        "path": "/api/users/service_info",
        "query_data": {"uid": "nope", "entity_id": "nope"},
        "status_code": 200
    },
    {
        "name": "user_api.suspended",
        "method": "GET",
        "path": "/api/users/suspended"
    },
    {
        "name": "user_api.update_user",
        "method": "PUT",
        "path": "/api/users/"
    },
    {
        "name": "user_api.user_query",
        "method": "GET",
        "path": "/api/users/query"
    },
    {
        "name": "user_api.user_search",
        "method": "GET",
        "path": "/api/users/search"
    },
    {
        "name": "user_login_api.summary",
        "method": "GET",
        "path": "/api/user_logins/summary"
    },
    {
        "name": "user_saml_api.proxy_authz",
        "method": "POST",
        "path": "/api/users/proxy_authz"
    },
    {
        "name": "user_token_api.delete_api_key",
        "method": "DELETE",
        "path": "/api/user_tokens/<user_token_id>"
    },
    {
        "name": "user_token_api.generate_random_token",
        "method": "GET",
        "path": "/api/user_tokens/generate_token"
    },
    {
        "name": "user_token_api.renew_lease",
        "method": "PUT",
        "path": "/api/user_tokens/renew_lease"
    },
    {
        "name": "user_token_api.save_token",
        "method": "POST",
        "path": "/api/user_tokens/"
    },
    {
        "name": "user_token_api.update_token",
        "method": "PUT",
        "path": "/api/user_tokens/"
    },
    {
        "name": "user_token_api.user_tokens",
        "method": "GET",
        "path": "/api/user_tokens/"
    }
]
