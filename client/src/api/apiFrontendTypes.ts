// These types are specified on the frontend for now, these should eventually come from backend. Just like the ones in apiTypes.ts
// They describe the endpoints that still return the serialized SQLAlchemy models, so they only
// declare the parts of those responses that the frontend actually reads.

type UserOrganisationMembershipView = {
    organisation_id: number;
    role?: string;
};

type UserCollaborationMembershipView = {
    collaboration_id: number;
    role?: string;
};

type UserServiceMembershipView = {
    service_id: number;
    role?: string;
};

/**
 * What /api/users/me and /api/users/refresh return: the logged-in user with the memberships that
 * determine what they are allowed to see and do.
 */
export type CurrentUserView = {
    id: number;
    admin: boolean;
    guest?: boolean;
    name?: string;
    organisation_memberships: UserOrganisationMembershipView[];
    collaboration_memberships: UserCollaborationMembershipView[];
    organisations_from_user_schac_home?: unknown;
    service_memberships?: UserServiceMembershipView[];
};

export type CollaborationMembershipView = {
    id: number;
    user_id: number;
    role: string;
    status: string;
    expiry_date?: number | null;
    created_at: number;
    // the invitation view only discloses the name and the email of a member
    user?: {
        id?: number;
        name?: string | null;
        email?: string | null;
    };
};

type CollaborationOrganisationView = {
    id: number;
    name: string;
};

type CollaborationGroupView = {
    id: number;
    name: string;
};

type CollaborationServiceView = {
    id: number;
    name: string;
    token_enabled?: boolean | null;
};

/**
 * What /api/collaborations/find_by_identifier returns: the collaboration as shown to a user who is
 * not a member and considers requesting to join.
 */
export type CollaborationJoinRequestView = {
    id: number;
    identifier: string;
    name: string;
    description: string;
    short_name: string;
    logo?: string | null;
    website_url?: string | null;
    support_email?: string | null;
    organisation_id: number;
    organisation: CollaborationOrganisationView;
    status: string;
    expiry_date?: number | null;
    last_activity_date: number;
    disable_join_requests?: boolean | null;
    disclose_member_information?: boolean | null;
    disclose_email_information?: boolean | null;
    collaboration_memberships_count: number;
    groups: CollaborationGroupView[];
    services: CollaborationServiceView[];
};

/**
 * The collaboration as shown to an invitee, which does list the members.
 */
type CollaborationInvitationView = CollaborationJoinRequestView & {
    collaboration_memberships: CollaborationMembershipView[];
};

export type CollaborationInvitation = {
    hash: string;
    collaboration_id: number;
    intended_role: string;
    collaboration: CollaborationInvitationView;
};

export type InvitationByHashResponse = {
    invitation: CollaborationInvitation;
    service_emails: Record<string, string[]>;
    admin_emails: string[];
};

export type CollaborationAccessResponse = {
    access: string;
};

export type CollaborationIdResponse = {
    id: number;
};

export type CollaborationUserToken = {
    service_id: number;
};
