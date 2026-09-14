// These types are specified on the frontend for now, these should eventually come from backend. Just like the ones in apiTypes.ts
// They describe the endpoints that still return the serialized SQLAlchemy models, so they only
// declare the parts of those responses that the frontend actually reads.
/**
 * What /api/users/me and /api/users/refresh return: the logged-in user with the memberships that
 * determine what they are allowed to see and do.
 */
export type CurrentUserView = {
    id: number;
    admin: boolean;
    guest?: boolean;
    name?: string;
    organisation_memberships: Array<{
        organisation_id: number;
        role?: string;
    }>;
    collaboration_memberships: Array<{
        collaboration_id: number;
        role?: string;
    }>;
    organisations_from_user_schac_home?: unknown;
    service_memberships?: Array<{
        service_id: number;
        role?: string;
    }>;
};

export type CollaborationUserToken = {
    service_id: number;
};
