import {fetchJson} from "@/api/index";

export type AppConfig = {
    local: boolean;
    base_url: string;
    base_server_url: string;
    socket_url: string;
    api_keys_enabled: boolean;
    feedback_enabled: boolean;
    seed_allowed: boolean;
    organisation_categories: string[];
    second_factor_authentication_required: boolean;
    impersonation_allowed: boolean;
    ldap_url: string;
    ldap_bind_account: string;
    continue_eduteams_redirect_uri: string;
    continue_eb_redirect_uri: string;
    introspect_endpoint: string;
    past_dates_allowed: boolean;
    mock_scim_enabled: boolean;
    threshold_for_collaboration_inactivity_warning: number;
    manage_enabled: boolean;
    manage_base_url: string;
    sram_service_entity_id: string;
};

export function config(): Promise<AppConfig> {
    return fetchJson("/config");
}
