import {AppConfig} from "@/api/config";
import I18n from "../../locale/I18n";
import {setFlash} from "../../utils/Flash";
import {isEmpty} from "../../utils/Utils";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import moment from "moment";

import {CollaborationDetailModel, CollaborationHeaderUser} from "./CollaborationTypes";

export type UseCollaborationExpiryFlashArgs = {
    onActivate: () => void;
    onUnsuspend: () => void;
    onEditCollaboration: (collaborationId: number) => void;
};

const isExpiryDateWarning = (expiry_date: number): boolean => {
    const today = new Date().getTime();
    const expiryDate = expiry_date * 1000;
    const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
    return days < 60;
};

const mailToAdmins = (collaboration: CollaborationDetailModel, title: string): void => {
    const a = document.createElement("a");
    const mails = collaboration.collaboration_memberships
        .filter(membership => membership.role === "admin")
        .map(membership => membership.user?.email)
        .join(",");
    a.href = `mailto:${mails}?subject=${encodeURIComponent(title)}`;
    a.click();
};

const hasCollaborationAdmin = (collaboration: CollaborationDetailModel): boolean => {
    return collaboration.collaboration_memberships
        .some(membership => membership.role === "admin");
};

const isCollaborationAlmostSuspended = (
    _user: CollaborationHeaderUser,
    collaboration: CollaborationDetailModel,
    config: AppConfig
): number | false => {
    const threshold = config.threshold_for_collaboration_inactivity_warning;
    if (!collaboration.last_activity_date) {
        return false;
    }
    const lastActivityDate = new Date(collaboration.last_activity_date * 1000);
    const now = new Date();
    now.setDate(now.getDate() - threshold);
    if (lastActivityDate <= now && collaboration.status === "active") {
        return Math.round((now.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24));
    }
    return false;
};

export const createShowExpiryDateFlash = ({
    onActivate,
    onUnsuspend,
    onEditCollaboration
}: UseCollaborationExpiryFlashArgs) =>
    (
        currentUser: CollaborationHeaderUser,
        currentCollaboration: CollaborationDetailModel,
        currentConfig: AppConfig,
        currentShowMemberView: boolean
    ) => {
        let msg = "";
        let action: (() => void) | null = null;
        let actionLabel: string | null = null;
        const membership = currentCollaboration.collaboration_memberships.find(m => m.user_id === currentUser.id);
        const isMember = !isUserAllowed(ROLES.COLL_ADMIN, currentUser, currentCollaboration.organisation_id, currentCollaboration.id);
        if (membership && membership.expiry_date) {
            const formattedMembershipExpiryDate = moment(membership.expiry_date * 1000).format("LL");
            if (membership.status === "expired") {
                msg += I18n.t(`organisationMembership.status.expiredTooltip${isMember ? "Member" : ""}`, {date: formattedMembershipExpiryDate});
                if (isMember && currentShowMemberView && hasCollaborationAdmin(currentCollaboration)) {
                    action = () => mailToAdmins(currentCollaboration, I18n.t("collaboration.status.askForReactivationSubject", {email: membership.user?.email}));
                    actionLabel = I18n.t("collaboration.status.askForReactivation");
                }
            } else if (isExpiryDateWarning(membership.expiry_date)) {
                msg += I18n.t("organisationMembership.status.activeWithExpiryDateTooltip", {date: formattedMembershipExpiryDate});
                if (isMember && currentShowMemberView && hasCollaborationAdmin(currentCollaboration)) {
                    action = () => mailToAdmins(currentCollaboration, I18n.t("collaboration.status.askForExtensionSubject", {email: membership.user?.email}));
                    actionLabel = I18n.t("collaboration.status.askForExtension");
                }
            }
        }
        if (currentCollaboration && currentCollaboration.expiry_date) {
            const formattedCollaborationExpiryDate = moment(currentCollaboration.expiry_date * 1000).format("LL");
            if (currentCollaboration.status === "expired") {
                msg += I18n.t("collaboration.status.expiredTooltip", {expiryDate: formattedCollaborationExpiryDate});
                if (!isMember && currentShowMemberView) {
                    action = onActivate;
                    actionLabel = I18n.t("collaboration.status.activate");
                }
            } else if (isExpiryDateWarning(currentCollaboration.expiry_date)) {
                msg += I18n.t("collaboration.status.activeWithExpiryDateTooltip", {expiryDate: formattedCollaborationExpiryDate});
                if (!isMember && currentShowMemberView) {
                    action = () => onEditCollaboration(currentCollaboration.id);
                    actionLabel = I18n.t("collaboration.status.activeWithExpiryDateAction");
                }
            }
        }
        if (currentCollaboration && currentCollaboration.status === "suspended") {
            msg += I18n.t("collaboration.status.suspendedTooltip", {
                lastActivityDate: moment((currentCollaboration.last_activity_date || 0) * 1000).format("LL")
            });
            if (!isMember && currentShowMemberView) {
                action = onUnsuspend;
                actionLabel = I18n.t("home.unsuspend");
            }
        }
        if (currentCollaboration && currentCollaboration.last_activity_date) {
            const almostSuspended = isCollaborationAlmostSuspended(currentUser, currentCollaboration, currentConfig);
            if (almostSuspended) {
                msg += I18n.t("collaboration.status.almostSuspended", {
                    days: almostSuspended
                });
                if (!isMember && currentShowMemberView) {
                    action = onUnsuspend;
                    actionLabel = I18n.t("home.avoidSuspending");
                }
            }
        }
        if (!isEmpty(msg)) {
            setFlash(msg, "warning", action, actionLabel);
        }
    };
