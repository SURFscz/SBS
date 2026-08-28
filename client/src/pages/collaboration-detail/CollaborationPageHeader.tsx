import React, {FC, ReactNode} from "react";
import moment from "moment";
import {ButtonType, Tooltip} from "@surfnet/sds";

import UnitHeader from "../../components/redesign/unit-header/UnitHeader";
import Button from "../../components/button/Button";
import I18n from "../../locale/I18n";
import {clearFlash} from "../../utils/Flash";
import {isEmpty} from "../../utils/Utils";
import MemberIcon from "../../icons/groups.svg?react";
import TimerIcon from "../../icons/streamline/timer2.svg?react";
import MemberStatusIcon from "@surfnet/sds/icons/functional-icons/id-1.svg?react";

type CollaborationMembership = {
    user_id: number;
    role: string;
    status: string;
    expiry_date?: number | null;
    created_at: number;
};

type CollaborationHeaderUser = {
    id: number;
    admin: boolean;
    organisation_memberships: { organisation_id: number }[];
    collaboration_memberships: { collaboration_id: number }[];
};

type CollaborationHeaderModel = {
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

type HistoryLike = {
    push: (path: string) => void;
};

type HeaderAction = {
    buttonType: string;
    name: string;
    perform: (e?: unknown) => void;
};

type IconListItem = {
    Icon: ReactNode;
    value: ReactNode;
};

export type CollaborationPageHeaderProps = {
    collaboration: CollaborationHeaderModel;
    user: CollaborationHeaderUser;
    history: HistoryLike;
    allowedToEdit: boolean;
    adminOfCollaboration: boolean;
    showMemberView: boolean;
    collaborationJoinRequest: boolean;
    alreadyMember: boolean;
    onLeave: (e?: unknown) => void;
    onAddMe: (e?: unknown) => void;
    onToggleView: () => void;
    onBoarding: () => void;
    onOpenJoinRequest: () => void;
};

const showHistory = (user: CollaborationHeaderUser, collaboration: CollaborationHeaderModel): boolean => {
    /**
     * If the user is an organisation admin / manager and not a member of the collaboration, then the option
     * "Add me to this collaboration" is added. To show this in the drop-down we add this to the chevron, but we need
     * to hide the normal 'show history' button. We have a max of three buttons, but we don't want an "Other options"
     * dropdown with only one option.
     */
    return user.organisation_memberships.some(om => om.organisation_id === collaboration.organisation_id) &&
        !user.collaboration_memberships.some(cm => cm.collaboration_id === collaboration.id);
};

const getMembershipStatus = (collaboration: CollaborationHeaderModel, user: CollaborationHeaderUser) => {
    if (!user || !collaboration || isEmpty(collaboration.collaboration_memberships)) {
        return null;
    }
    const membership = collaboration.collaboration_memberships.find(cm => cm.user_id === user.id);
    if (!membership) {
        return null;
    }
    const expiryDate = membership.expiry_date ? moment(membership.expiry_date * 1000).format("LL") : null;
    if (membership.status === "active") {
        return (<span>
            {I18n.t("coPageHeaders.membership", {date: moment(membership.created_at * 1000).format("LL")})}
            {expiryDate && <Tooltip tip={I18n.t("coPageHeaders.expiresTooltip", {date: expiryDate})}/>}
        </span>);
    }
    return <span>{I18n.t("collaboration.status.expired")}</span>;
};

const getCollaborationStatus = (collaboration: CollaborationHeaderModel) => {
    if (!collaboration.expiry_date) {
        return null;
    }
    const expiryDate = moment(collaboration.expiry_date * 1000).format("LL");
    const status = (collaboration.status === "active" && collaboration.expiry_date) ? "activeWithExpiryDate" : collaboration.status;
    return (<span>
        {I18n.t(`collaboration.status.${status}`, {expiryDate: expiryDate})}
    </span>);
};

const getMemberIconListItem = (collaboration: CollaborationHeaderModel): IconListItem => {
    const memberCount = collaboration.collaboration_memberships_count;
    const groupCount = collaboration.groups.length;
    return {
        Icon: <MemberIcon/>,
        value: <span>{I18n.t("coPageHeaders.membersGroups", {
            memberCount: memberCount === 0 ? I18n.t("coPageHeaders.no") : memberCount,
            members: memberCount === 1 ? I18n.t("coPageHeaders.singleMember") : I18n.t("coPageHeaders.multipleMembers"),
            groupCount: groupCount === 0 ? I18n.t("coPageHeaders.no").toLowerCase() : groupCount,
            groups: groupCount === 1 ? I18n.t("coPageHeaders.singleGroup") : I18n.t("coPageHeaders.multipleGroups"),
        })}
        </span>
    };
};

const getIconListItems = (iconListItems: IconListItem[]) => {
    return (<div className={"icon-list-items"}>
        {iconListItems.map((item, index) => <div className={"icon-list-item"} key={index}>
            {item.Icon}
            {item.value}
        </div>)}
    </div>);
};

const getActions = ({
    user,
    collaboration,
    history,
    allowedToEdit,
    showMemberView,
    adminOfCollaboration,
    onLeave,
    onAddMe,
    onToggleView
}: Pick<CollaborationPageHeaderProps,
    "user" | "collaboration" | "history" | "allowedToEdit" | "showMemberView" | "adminOfCollaboration" | "onLeave" | "onAddMe" | "onToggleView">
): HeaderAction[] => {
    const historyIsShownInChevron = showHistory(user, collaboration);
    const actions: HeaderAction[] = [];
    if (allowedToEdit && showMemberView) {
        actions.push({
            buttonType: ButtonType.Primary, name: I18n.t("home.edit"), perform: () => {
                clearFlash();
                history.push("/edit-collaboration/" + collaboration.id);
            }
        });
    }
    const isMember = collaboration.collaboration_memberships.some(m => m.user_id === user.id);
    if (isMember) {
        actions.push({
            buttonType: ButtonType.DestructiveSecondary,
            name: I18n.t("models.collaboration.leave"),
            perform: onLeave
        });
    }

    if (adminOfCollaboration) {
        actions.push({
            buttonType: ButtonType.Secondary,
            name: I18n.t(`models.collaboration.${showMemberView ? "viewAsMember" : "viewAsAdmin"}`),
            perform: () => onToggleView()
        });
    }
    if (adminOfCollaboration && !user.admin && showMemberView && !historyIsShownInChevron) {
        const queryParam = `name=${encodeURIComponent(collaboration.name)}&back=${encodeURIComponent(window.location.pathname)}`;
        actions.push({
            buttonType: ButtonType.Secondary,
            name: I18n.t("home.history"),
            perform: () => history.push(`/audit-logs/collaborations/${collaboration.id}?${queryParam}`)
        });
    }
    if (!isMember && adminOfCollaboration && showMemberView) {
        actions.push({
            buttonType: ButtonType.Chevron, name: I18n.t("collaborationDetail.addMe"),
            perform: onAddMe
        });
    }
    return actions;
};

export const CollaborationPageHeader: FC<CollaborationPageHeaderProps> = ({
    collaboration,
    user,
    history,
    allowedToEdit,
    adminOfCollaboration,
    showMemberView,
    collaborationJoinRequest,
    alreadyMember,
    onLeave,
    onAddMe,
    onToggleView,
    onBoarding,
    onOpenJoinRequest
}) => {
    const actions = getActions({
        user,
        collaboration,
        history,
        allowedToEdit,
        showMemberView,
        adminOfCollaboration,
        onLeave,
        onAddMe,
        onToggleView
    });

    if (adminOfCollaboration && showMemberView) {
        const iconListItems: IconListItem[] = [
            getMemberIconListItem(collaboration)
        ];
        const collaborationStatus = getCollaborationStatus(collaboration);
        if (collaborationStatus) {
            iconListItems.push({
                Icon: <TimerIcon/>, value: collaborationStatus
            });
        }

        return (
            <UnitHeader obj={collaboration}
                        firstTime={user.admin ? onBoarding : undefined}
                        history={((user.admin || showHistory(user, collaboration)) && allowedToEdit) && history}
                        auditLogPath={`collaborations/${collaboration.id}`}
                        breadcrumbName={I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
                        name={collaboration.name}
                        displayDescription={false}
                        actions={actions}>
                {getIconListItems(iconListItems)}
            </UnitHeader>
        );
    }

    const customAction = collaborationJoinRequest ? (
        <div className="join-request-action">
            <Button txt={I18n.t("registration.joinRequest", {name: collaboration.name})}
                    disabled={alreadyMember}
                    onClick={onOpenJoinRequest}/>
        </div>
    ) : null;
    const iconListItems: IconListItem[] = [
        getMemberIconListItem(collaboration)
    ];
    const membershipStatus = getMembershipStatus(collaboration, user);
    if (!collaborationJoinRequest && membershipStatus) {
        iconListItems.push({
            Icon: <MemberStatusIcon/>, value: membershipStatus
        });
    }
    return <UnitHeader obj={collaboration}
                       actions={collaborationJoinRequest ? [] : actions}
                       name={collaboration.name}
                       displayDescription={false}
                       customAction={customAction}>
        {getIconListItems(iconListItems)}
    </UnitHeader>;
};
