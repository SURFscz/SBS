import {isEmpty} from "./Utils";

//Question: Who can connect to this service?
export const SELECTED_INSTITUTION = "SELECTED_INSTITUTION";
export const NO_ONE_ALLOWED = "NO_ONE_ALLOWED";
export const ALL_ALLOWED = "ALL_ALLOWED";

//Question: Who can connect to this service?
export const ALL_INSTITUTIONS = "ALL_INSTITUTIONS";
export const SOME_INSTITUTIONS = "SOME_INSTITUTIONS";

//Question: Can a CO directly connect?
export const DIRECT_CONNECTION = "DIRECT_CONNECTION";
export const MANUALLY_APPROVE = "MANUALLY_APPROVE";
export const IT_DEPENDS = "IT_DEPENDS";

export const connectionAllowed = service => {
    if (service.non_member_users_access_allowed) {
        return ALL_ALLOWED;
    }
    if (!service.automatic_connection_allowed && !service.access_allowed_for_all
        && isEmpty(service.allowed_organisations) && isEmpty(service.automatic_connection_allowed_organisations
            && service.connection_setting === "NO_ONE_ALLOWED")) {
        return NO_ONE_ALLOWED;
    }
    return SELECTED_INSTITUTION;
}

export const institutionAccess = service => {
    return service.access_allowed_for_all ? ALL_INSTITUTIONS : SOME_INSTITUTIONS;
}

export const connectionSetting = service => {
    if (service.automatic_connection_allowed) {
        return DIRECT_CONNECTION;
    }
    if (!isEmpty(service.connection_setting)) {
        return service.connection_setting;
    }
    return IT_DEPENDS;
}