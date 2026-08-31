import {ReactNode} from "react";

type CollaborationMembership = {
    user_id: number;
    role: string;
    status: string;
    expiry_date?: number | null;
    created_at: number;
};

export type CollaborationHeaderUser = {
    id: number;
    admin: boolean;
    organisation_memberships: { organisation_id: number }[];
    collaboration_memberships: { collaboration_id: number }[];
};

export type CollaborationHeaderModel = {
    id: number;
    name: string;
    organisation_id: number;
    organisation: { name: string };
    groups: unknown[];
    collaboration_memberships_count: number;
    collaboration_memberships: CollaborationMembership[];
    expiry_date?: number | null;
    status: string;
};

export type HistoryLike = {
    push: (path: string) => void;
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
