import {ReactNode} from "react";

export type {
    CollaborationDetailModel,
    CollaborationHeaderModel,
    CollaborationInvitation,
    CollaborationInvitationSummary,
    CollaborationUserToken
} from "../../api/apiFrontendTypes";

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
