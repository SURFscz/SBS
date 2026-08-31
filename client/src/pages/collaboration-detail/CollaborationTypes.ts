import {ReactNode} from "react";

export type CollaborationMembershipRole = "admin" | "member";
export type CollaborationStatus = "active" | "expired" | "suspended";
export type MembershipStatus = "active" | "expired";
export type CollaborationTabName =
    | "about"
    | "admins"
    | "members"
    | "groups"
    | "services"
    | "joinrequests"
    | "tokens";

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

export type UserOrganisationMembership = {
    organisation_id: number;
    role?: string;
};

export type UserCollaborationMembership = {
    collaboration_id: number;
    role?: string;
};

export type CollaborationHeaderUser = {
    id: number;
    admin: boolean;
    guest?: boolean;
    name?: string;
    organisation_memberships: UserOrganisationMembership[];
    collaboration_memberships: UserCollaborationMembership[];
    organisations_from_user_schac_home?: unknown;
    service_memberships?: { service_id: number; role?: string }[];
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

export type HistoryLike = {
    push: (path: string, state?: unknown) => void;
};

export type HeaderAction = {
    buttonType: string;
    name: string;
    perform: (e?: unknown) => void;
};

export type IconListItem = {
    Icon: ReactNode;
    value: ReactNode;
};

export type CollaborationRouteParams = {
    id?: string;
    hash?: string;
    tab?: string;
    groupId?: string;
};

export type CollaborationTabPaneProps = {
    name: string;
    label: string;
    notifier?: boolean | number | null;
    readOnly?: boolean;
    children?: ReactNode;
};
