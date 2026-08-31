// These types are specified on the frontend for now, these should eventually come from backend. Just like the ones in apiTypes.ts

export type CollaborationMembership = {
    user_id: number;
    role: string;
    status: string;
    expiry_date?: number | null;
    created_at: number;
    user?: {
        id?: number;
        email: string;
    };
};

export type CollaborationOrganisation = {
    id?: number;
    name: string;
};

export type CollaborationService = {
    id: number;
    token_enabled?: boolean | null;
};

export type CollaborationInvitationSummary = {
    expiry_date?: number | null;
};

export type CollaborationJoinRequest = {
    status: string;
};

export type CollaborationServiceConnectionRequest = {
    status: string;
};

export type CollaborationHeaderModel = {
    id: number;
    name: string;
    organisation_id: number;
    organisation: CollaborationOrganisation;
    groups: unknown[];
    collaboration_memberships_count: number;
    collaboration_memberships: CollaborationMembership[];
    expiry_date?: number | null;
    status: string;
};

export type CollaborationDetailModel = CollaborationHeaderModel & {
    description?: string;
    disable_join_requests?: boolean | null;
    disclose_member_information?: boolean | null;
    last_activity_date?: number | null;
    services: CollaborationService[];
    invitations?: CollaborationInvitationSummary[];
    join_requests?: CollaborationJoinRequest[];
    service_connection_requests?: CollaborationServiceConnectionRequest[];
};

export type CollaborationInvitation = {
    hash: string;
    collaboration_id: number;
    intended_role: string;
    collaboration: CollaborationDetailModel;
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
