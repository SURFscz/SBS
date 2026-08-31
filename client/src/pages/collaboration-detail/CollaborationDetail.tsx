import React, {FC, ReactElement, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import {RouteComponentProps} from "react-router-dom";

import {
    activateCollaboration,
    collaborationAccessAllowed,
    collaborationById,
    collaborationByIdentifier,
    collaborationIdByIdentifier,
    collaborationLiteById,
    createCollaborationMembershipRole,
    deleteCollaborationMembership,
    deleteInvitationByHash,
    health,
    invitationAccept,
    invitationByHash,
    unsuspendCollaboration,
    userTokensOfUser
} from "../../api";
import "./CollaborationDetail.scss";
import I18n from "../../locale/I18n";
import {AppStore} from "../../stores/AppStore";
import Tabs from "../../components/tabs/Tabs";
import CollaborationAdmins from "../../components/redesign/collaboration-admins/CollaborationAdmins";
import {CollaborationPageHeader} from "./CollaborationPageHeader";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import UsedServices from "../../components/redesign/used-services/UsedServices";
import Groups from "../../components/redesign/groups/Groups";
import AboutCollaboration from "../../components/redesign/about-collaboration/AboutCollaboration";
import {actionMenuUserRole, isUserAllowed, ROLES} from "../../utils/UserRole";
import {getParameterByName} from "../../utils/QueryParameters";
import CollaborationWelcomeDialog from "../../components/collaboration-welcome-dialog/CollaborationWelcomeDialog";
import JoinRequests from "../../components/redesign/join-requests/JoinRequests";
import {clearFlash, setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import JoinRequestDialog from "../../components/join-request-dialog/JoinRequestDialog";
import LastAdminWarning from "../../components/redesign/last-admin-warning/LastAdminWarning";
import moment from "moment";
import {ErrorOrigins, isEmpty, stopEvent} from "../../utils/Utils";
import UserTokens from "../../components/redesign/user-tokens/UserTokens";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../utils/SocketIO";
import {isUuid4} from "../../validations/regExps";
import {isInvitationExpired} from "../../utils/Date";
import {AppConfig} from "@/api/config";
import {
    CollaborationAccessResponse,
    CollaborationDetailModel,
    CollaborationHeaderUser,
    CollaborationIdResponse,
    CollaborationInvitation,
    CollaborationInvitationSummary,
    CollaborationRouteParams,
    CollaborationTabPaneProps,
    CollaborationUserToken,
    InvitationByHashResponse
} from "./CollaborationTypes";

export type CollaborationDetailProps = RouteComponentProps<CollaborationRouteParams> & {
    user: CollaborationHeaderUser;
    config: AppConfig;
    refreshUser: (callback?: () => void) => void;
    collaborationIdentifier?: string;
};

type SocketMessage = {
    subscription_id: string;
};

const CollaborationTabPane = ({children, ...tabProps}: CollaborationTabPaneProps) =>
    React.createElement("div", tabProps as React.HTMLAttributes<HTMLDivElement>, children);

type IsUserAllowed = (
    minimalRole: string,
    currentUser: CollaborationHeaderUser,
    organisationId?: number | null,
    collaborationId?: number | null
) => boolean;

const userIsAllowed = isUserAllowed as IsUserAllowed;

type SetFlash = (
    message: string,
    type?: string,
    action?: (() => void) | null,
    actionLabel?: string | null
) => void;

const showFlash = setFlash as SetFlash;

type UserTokensOfUser = (serviceId?: number) => Promise<CollaborationUserToken[]>;
const loadUserTokens = userTokensOfUser as UserTokensOfUser;

type AppStoreState = {
    breadcrumb: { paths: { path?: string; value: string }[] };
    objectRole: string | null;
    actions: unknown[];
};

const updateStore = (updater: (state: AppStoreState) => void) => {
    AppStore.update(updater as Parameters<typeof AppStore.update>[0]);
};

type ConfirmationDialogProps = {
    isOpen?: boolean;
    cancel?: () => void;
    confirm: () => void;
    isWarning?: boolean;
    question?: string;
    children?: React.ReactNode;
    confirmationTxt?: unknown;
    confirmationHeader?: unknown;
};

const TypedConfirmationDialog = ConfirmationDialog as FC<ConfirmationDialogProps>;

const fetchInvitationByHash = invitationByHash as (hash: string, expand?: boolean) => Promise<InvitationByHashResponse>;
const fetchCollaborationIdByIdentifier = collaborationIdByIdentifier as (identifier: string) => Promise<CollaborationIdResponse>;
const fetchCollaborationAccessAllowed = collaborationAccessAllowed as (id: number) => Promise<CollaborationAccessResponse>;
const fetchCollaborationById = collaborationById as (id: number) => Promise<CollaborationDetailModel>;
const fetchCollaborationByIdentifier = collaborationByIdentifier as (identifier: string) => Promise<CollaborationDetailModel>;

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

const updateAppStore = (
    user: CollaborationHeaderUser,
    _config: AppConfig,
    collaboration: CollaborationDetailModel,
    _adminOfCollaboration: boolean,
    orgManager: boolean
): void => {
    updateStore(s => {
        s.breadcrumb.paths = orgManager ? [{path: "/", value: I18n.t("breadcrumb.home")}, {
                path: `/organisations/${collaboration.organisation_id}`,
                value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name})
            }, {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}]
            : [{
                path: "/?redirect=false",
                value: I18n.t("breadcrumb.home")
            }, {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}];
        s.objectRole = actionMenuUserRole(user, collaboration.organisation, collaboration, null, true);
    });
};

type LatestCollaborationState = {
    props: CollaborationDetailProps;
    collaboration: CollaborationDetailModel | null;
    tab: string;
    invitation: CollaborationInvitation | null;
    isInvitation: boolean;
    adminOfCollaboration: boolean;
    orgManager: boolean;
    showMemberView: boolean;
};

export type CollaborationDetailHandle = {
    componentDidMount: (callback?: () => void) => void;
    tabChanged: (name: string, id?: number, groupIdentifier?: string | number | null) => void;
    doAcceptInvitation: () => void;
    getTabs: (
        currentCollaboration: CollaborationDetailModel,
        currentUserTokens: CollaborationUserToken[] | null,
        schacHomeOrganisations: unknown,
        currentAdminOfCollaboration: boolean,
        currentShowMemberView: boolean,
        isJoinRequest?: boolean
    ) => ReactElement[];
};

export const CollaborationDetail = forwardRef<CollaborationDetailHandle, CollaborationDetailProps>((props, ref) => {
    const {user, history, refreshUser} = props;

    const [invitation, setInvitation] = useState<CollaborationInvitation | null>(null);
    const [serviceEmails, setServiceEmails] = useState<Record<string, string[]>>({});
    const [adminEmails, setAdminEmails] = useState<string[]>([]);
    const [collaboration, setCollaboration] = useState<CollaborationDetailModel | null>(null);
    const [schacHomeOrganisations, setSchacHomeOrganisations] = useState<unknown>(null);
    const [userTokens, setUserTokens] = useState<CollaborationUserToken[] | null>(null);
    const [adminOfCollaboration, setAdminOfCollaboration] = useState(false);
    const [collaborationJoinRequest, setCollaborationJoinRequest] = useState(false);
    const [showMemberView, setShowMemberView] = useState(true);
    const [alreadyMember, setAlreadyMember] = useState(false);
    const [loading, setLoading] = useState(true);
    const [firstTime, setFirstTime] = useState(false);
    const [isInvitation, setIsInvitation] = useState(false);
    const [tab, setTab] = useState("about");
    const [orgManager, setOrgManager] = useState(false);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationDialogAction, setConfirmationDialogAction] = useState<() => void>(() => () => true);
    const [confirmationQuestion, setConfirmationQuestion] = useState("");
    const [lastAdminWarning, setLastAdminWarning] = useState(false);
    const [joinRequestDialogOpen, setJoinRequestDialogOpen] = useState(false);
    const [alreadyCollaborationMembership, setAlreadyCollaborationMembership] = useState(false);
    const [isWarning, setIsWarning] = useState(false);
    const groupId = null;

    const latestRef = useRef<LatestCollaborationState>({
        props,
        collaboration: null,
        tab: "about",
        invitation: null,
        isInvitation: false,
        adminOfCollaboration: false,
        orgManager: false,
        showMemberView: true
    });
    const socketSubscribedRef = useRef(false);
    const loadCollaborationRef = useRef<(callback?: () => void) => void>(() => undefined);

    const cancelDialogAction = () => setConfirmationDialogOpen(false);

    const showExpiryDateFlash = (
        currentUser: CollaborationHeaderUser,
        currentCollaboration: CollaborationDetailModel,
        currentConfig: AppConfig,
        currentShowMemberView: boolean
    ) => {
        let msg = "";
        let action: (() => void) | null = null;
        let actionLabel: string | null = null;
        const membership = currentCollaboration.collaboration_memberships.find(m => m.user_id === currentUser.id);
        const isMember = !userIsAllowed(ROLES.COLL_ADMIN, currentUser, currentCollaboration.organisation_id, currentCollaboration.id);
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
                    action = activate(true);
                    actionLabel = I18n.t("collaboration.status.activate");
                }
            } else if (isExpiryDateWarning(currentCollaboration.expiry_date)) {
                msg += I18n.t("collaboration.status.activeWithExpiryDateTooltip", {expiryDate: formattedCollaborationExpiryDate});
                if (!isMember && currentShowMemberView) {
                    action = () => latestRef.current.props.history.push(`/edit-collaboration/${currentCollaboration.id}`);
                    actionLabel = I18n.t("collaboration.status.activeWithExpiryDateAction");
                }
            }
        }
        if (currentCollaboration && currentCollaboration.status === "suspended") {
            msg += I18n.t("collaboration.status.suspendedTooltip", {
                lastActivityDate: moment((currentCollaboration.last_activity_date || 0) * 1000).format("LL")
            });
            if (!isMember && currentShowMemberView) {
                action = unsuspend(true);
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
                    action = unsuspend(true);
                    actionLabel = I18n.t("home.avoidSuspending");
                }
            }
        }
        if (!isEmpty(msg)) {
            showFlash(msg, "warning", action, actionLabel);
        }
    };

    const subscribeToCollaborationSocket = (currentCollaboration: CollaborationDetailModel) => {
        if (socketSubscribedRef.current) {
            return;
        }
        [`collaboration_${currentCollaboration.id}`, "service", `organisation_${currentCollaboration.organisation_id}`]
            .forEach(topic => {
                socket.then(s => s.on(topic, (data: SocketMessage) => {
                    const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                    if (subscriptionIdSessionStorage !== data.subscription_id) {
                        latestRef.current.props.refreshUser(() => loadCollaborationRef.current());
                    }
                }));
            });
        socketSubscribedRef.current = true;
    };

    const loadCollaboration = (callback?: () => void) => {
        const currentProps = latestRef.current.props;
        const params = currentProps.match.params;
        if (params.hash) {
            fetchInvitationByHash(params.hash, true).then(res => {
                const currentUser = currentProps.user;
                const nextInvitation = res["invitation"];
                const membership = (currentUser.collaboration_memberships || []).find(m => m.collaboration_id === nextInvitation.collaboration_id);
                const nextServiceEmails = res["service_emails"];
                const nextAdminEmails = res["admin_emails"];
                latestRef.current.collaboration = nextInvitation.collaboration;
                latestRef.current.invitation = nextInvitation;
                setInvitation(nextInvitation);
                setCollaboration(nextInvitation.collaboration);
                setServiceEmails(nextServiceEmails);
                setAdminEmails(nextAdminEmails);
                setLoading(false);
                setFirstTime(true);
                setAdminOfCollaboration(false);
                setSchacHomeOrganisations([]);
                setConfirmationDialogOpen(false);
                setTab("about");
                setIsInvitation(true);
                setAlreadyCollaborationMembership(!isEmpty(membership));
            }).catch(() => currentProps.history.push(`/404?eo=${ErrorOrigins.invitationNotFound}`));
        } else if (params.id) {
            if (isUuid4(params.id)) {
                fetchCollaborationIdByIdentifier(params.id).then(res => {
                    const path = encodeURIComponent(`/collaborations/${res.id}`);
                    currentProps.history.push(`/refresh-route/${path}`);
                });
                return;
            }
            const collaboration_id = parseInt(params.id, 10);
            fetchCollaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const nextAdminOfCollaboration = json.access === "full";
                    const promises = nextAdminOfCollaboration
                        ? [fetchCollaborationById(collaboration_id), loadUserTokens()]
                        : [collaborationLiteById(collaboration_id), loadUserTokens()];
                    Promise.all(promises)
                        .then(res => {
                            const {user: currentUser, config: currentConfig} = latestRef.current.props;
                            const nextTab = params.tab || (nextAdminOfCollaboration ? latestRef.current.tab : "about");
                            const nextCollaboration = res[0] as CollaborationDetailModel;
                            const nextUserTokens = res[1] as CollaborationUserToken[];
                            const nextSchacHomeOrganisations = nextAdminOfCollaboration ? null : currentUser.organisations_from_user_schac_home;
                            const nextOrgManager = userIsAllowed(ROLES.ORG_MANAGER, currentUser, nextCollaboration.organisation_id, null);
                            const nextFirstTime = getParameterByName("first", window.location.search) === "true";
                            showExpiryDateFlash(currentUser, nextCollaboration, currentConfig, true);

                            latestRef.current.collaboration = nextCollaboration;
                            latestRef.current.adminOfCollaboration = nextAdminOfCollaboration;
                            latestRef.current.orgManager = nextOrgManager;
                            latestRef.current.tab = nextTab;
                            setCollaboration(nextCollaboration);
                            setUserTokens(nextUserTokens);
                            setAdminOfCollaboration(nextAdminOfCollaboration);
                            setSchacHomeOrganisations(nextSchacHomeOrganisations);
                            setLoading(false);
                            setOrgManager(nextOrgManager);
                            setConfirmationDialogOpen(false);
                            setFirstTime(nextFirstTime);
                            setTab(nextTab);
                            if (callback) {
                                callback();
                            }
                            updateAppStore(currentUser, currentConfig, nextCollaboration, nextAdminOfCollaboration, nextOrgManager);
                            subscribeToCollaborationSocket(nextCollaboration);
                        }).catch(() => {
                        latestRef.current.props.history.push("/404");
                    });
                }).catch(() => latestRef.current.props.history.push("/404"));
        } else {
            const {collaborationIdentifier: identifier, user: currentUser} = currentProps;
            if (!identifier) {
                currentProps.history.push("/404");
            } else {
                fetchCollaborationByIdentifier(identifier)
                    .then(res => {
                        const nextCollaboration = res;
                        if (nextCollaboration.disable_join_requests) {
                            currentProps.history.push("/404");
                        } else {
                            const nextAlreadyMember = currentUser.collaboration_memberships.some(m => m.collaboration_id === nextCollaboration.id);
                            if (nextAlreadyMember) {
                                setFlash(I18n.t("registration.alreadyMember", {name: nextCollaboration.name}), "error");
                            }
                            latestRef.current.collaboration = nextCollaboration;
                            setCollaboration(nextCollaboration);
                            setCollaborationJoinRequest(true);
                            setAlreadyMember(nextAlreadyMember);
                            setAdminOfCollaboration(false);
                            setSchacHomeOrganisations([]);
                            setLoading(false);
                            setConfirmationDialogOpen(false);
                            setTab("about");
                            updateStore(s => {
                                s.breadcrumb.paths = [{
                                    path: "/home?redirect=false",
                                    value: I18n.t("breadcrumb.home")
                                }, {value: I18n.t("breadcrumb.collaborationJoinRequest", {name: nextCollaboration.name})}];
                                s.objectRole = actionMenuUserRole(currentUser, nextCollaboration.organisation, nextCollaboration, null, true);
                            });
                        }
                    }).catch(() => {
                    currentProps.history.push("/404");
                });
            }
        }
    };

    useEffect(() => {
        latestRef.current = {
            props,
            collaboration,
            tab,
            invitation,
            isInvitation,
            adminOfCollaboration,
            orgManager,
            showMemberView
        };
        loadCollaborationRef.current = loadCollaboration;
    });

    useEffect(() => {
        loadCollaborationRef.current();
        return () => {
            clearFlash();
            updateStore(s => {
                s.objectRole = null;
                s.actions = [];
            });
            const params = latestRef.current.props.match.params;
            const currentCollaboration = latestRef.current.collaboration;
            if (params.id && currentCollaboration) {
                [`collaboration_${currentCollaboration.id}`, "service", `organisation_${currentCollaboration.organisation_id}`]
                    .forEach(topic => socket.then(s => s.off(topic)));
            }
        };
    }, []);

    const toggleAdminMemberView = () => {
        health().then(() => {
            const currentCollaboration = latestRef.current.collaboration;
            if (!currentCollaboration) {
                return;
            }
            const {config: currentConfig, user: currentUser} = latestRef.current.props;
            const newTab = "about";
            tabChanged(newTab, currentCollaboration.id);
            showExpiryDateFlash(currentUser, currentCollaboration, currentConfig, !latestRef.current.showMemberView);
            setShowMemberView(!latestRef.current.showMemberView);
            setTab(newTab);
        });
    };

    const onBoarding = () => {
        setFirstTime(true);
    };

    const tabChanged = (name: string, id?: number, groupIdentifier: string | number | null = null) => {
        const currentCollaboration = latestRef.current.collaboration;
        const collId = id || currentCollaboration?.id;
        const {user: currentUser, config: currentConfig, match: currentMatch, history: currentHistory} = latestRef.current.props;
        if (currentCollaboration) {
            updateAppStore(
                currentUser,
                currentConfig,
                currentCollaboration,
                latestRef.current.adminOfCollaboration,
                latestRef.current.orgManager
            );
        }
        if (!collId) {
            return;
        }
        const nextGroupId = groupIdentifier || currentMatch.params.groupId;
        const groupIdPart = !isEmpty(nextGroupId) && name === "groups" ? `/${nextGroupId}` : "";
        currentHistory.push(`/collaborations/${collId}/${name}${groupIdPart}`, {groupId: nextGroupId});
        // Otherwise the changed history.location.state is not picked up in Groups.jsx
        setTimeout(() => setTab(name), isEmpty(groupIdPart) ? 0 : 175);
    };

    const unsuspend = (showConfirmation: boolean) => () => {
        if (showConfirmation) {
            setConfirmationDialogOpen(true);
            setConfirmationQuestion(I18n.t("unsuspend.confirmation"));
            setConfirmationDialogAction(() => unsuspend(false));
            setIsWarning(false);
        } else {
            const currentCollaboration = latestRef.current.collaboration;
            if (!currentCollaboration) {
                return;
            }
            setLoading(true);
            unsuspendCollaboration(currentCollaboration.id).then(() => {
                loadCollaborationRef.current(() => {
                    setLoading(false);
                    setFlash(I18n.t("unsuspend.flash", {name: latestRef.current.collaboration?.name}));
                });
            });
        }
    };

    const activate = (showConfirmation: boolean) => () => {
        if (showConfirmation) {
            setConfirmationDialogOpen(true);
            setConfirmationQuestion(I18n.t("activate.confirmation"));
            setConfirmationDialogAction(() => activate(false));
            setIsWarning(false);
        } else {
            const currentCollaboration = latestRef.current.collaboration;
            if (!currentCollaboration) {
                return;
            }
            setLoading(true);
            activateCollaboration(currentCollaboration.id).then(() => {
                loadCollaborationRef.current(() => {
                    setLoading(false);
                    setFlash(I18n.t("activate.flash", {name: latestRef.current.collaboration?.name}));
                });
            });
        }
    };

    const doDeleteMe = () => {
        const {user: currentUser, refreshUser: currentRefreshUser, history: currentHistory} = latestRef.current.props;
        const currentCollaboration = latestRef.current.collaboration;
        if (!currentCollaboration) {
            return;
        }
        setConfirmationDialogOpen(false);
        setLoading(true);
        deleteCollaborationMembership(currentCollaboration.id, currentUser.id)
            .then(() => {
                currentRefreshUser(() => {
                    const canStay = userIsAllowed(ROLES.ORG_MANAGER, currentUser, currentCollaboration.organisation_id);
                    setFlash(I18n.t("organisationDetail.flash.memberDeleted", {name: currentUser.name}));
                    if (canStay) {
                        loadCollaborationRef.current();
                    } else {
                        currentHistory.push("/home");
                    }
                });
            });
    };

    const deleteMe = (e?: unknown) => {
        stopEvent(e);
        const currentUser = latestRef.current.props.user;
        const currentCollaboration = latestRef.current.collaboration;
        if (!currentCollaboration) {
            return;
        }
        const admins = currentCollaboration.collaboration_memberships.filter(m => m.role === "admin");
        const nextLastAdminWarning = admins.length === 1 && admins[0].user_id === currentUser.id;
        const canStay = userIsAllowed(ROLES.ORG_MANAGER, currentUser, currentCollaboration.organisation_id);
        if (!canStay || nextLastAdminWarning) {
            setConfirmationDialogOpen(true);
            setConfirmationQuestion(I18n.t("collaborationDetail.deleteYourselfMemberConfirmation"));
            setConfirmationDialogAction(() => doDeleteMe);
            setLastAdminWarning(nextLastAdminWarning);
            setIsWarning(true);
        } else {
            doDeleteMe();
        }
    };

    const addMe = (e?: unknown) => {
        stopEvent(e);
        const currentCollaboration = latestRef.current.collaboration;
        if (!currentCollaboration) {
            return;
        }
        setLoading(true);
        createCollaborationMembershipRole(currentCollaboration.id).then(() => {
            latestRef.current.props.refreshUser(() =>
                loadCollaborationRef.current(() => {
                    setLoading(false);
                    setFlash(I18n.t("collaborationDetail.flash.meAdded", {name: currentCollaboration.name}));
                }));
        });
    };

    const alreadyMemberConfirmation = (currentInvitation: CollaborationInvitation) => {
        setLoading(true);
        deleteInvitationByHash(currentInvitation.hash).then(() => {
            const path = encodeURIComponent(`/collaborations/${currentInvitation.collaboration_id}`);
            latestRef.current.props.history.push(`/refresh-route/${path}`);
        });
    };

    const doAcceptInvitation = () => {
        const currentInvitation = latestRef.current.invitation;
        if (latestRef.current.isInvitation && currentInvitation) {
            invitationAccept(currentInvitation).then(() => {
                latestRef.current.props.refreshUser(() => {
                    const path = encodeURIComponent(`/collaborations/${currentInvitation.collaboration_id}`);
                    latestRef.current.props.history.push(`/refresh-route/${path}`);
                });
            }).catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then((res: { message?: string }) => {
                        if (res.message && res.message.indexOf("already a member") > -1) {
                            setFirstTime(false);
                            setFlash(I18n.t("invitation.flash.alreadyMember", {"name": currentInvitation.collaboration.name}), "error");
                        }
                    });
                } else {
                    throw e;
                }
            });
        } else {
            setFirstTime(false);
        }
    };

    const addUserTokenTab = (
        currentUserTokens: CollaborationUserToken[] | null,
        services: CollaborationDetailModel["services"],
        isJoinRequest: boolean,
        tabs: Array<ReactElement | null>,
        currentCollaboration: CollaborationDetailModel
    ) => {
        if (currentUserTokens) {
            const filteredTokens = currentUserTokens.filter(userToken => services.find(service => service.id === userToken.service_id));
            if (!isJoinRequest && services.length > 0) {
                tabs.push(getUserTokensTab(filteredTokens, currentCollaboration, services));
            }
        }
    };

    const getCollaborationAdminsTab = (currentCollaboration: CollaborationDetailModel): ReactElement => {
        const expiredInvitations = (currentCollaboration.invitations || []).some((inv: CollaborationInvitationSummary) => isInvitationExpired(inv));
        return (<CollaborationTabPane key="admins"
                                      name="admins"
                                      label={I18n.t("home.tabs.coAdmins")}
                                      notifier={expiredInvitations}>
            <CollaborationAdmins {...props}
                                 collaboration={currentCollaboration}
                                 isAdminView={true}
                                 tabChanged={tabChanged}
                                 refresh={(callback?: () => void) => loadCollaboration(callback)}/>
        </CollaborationTabPane>);
    };

    const getMembersTab = (currentCollaboration: CollaborationDetailModel, currentShowMemberView: boolean, isJoinRequest = false): ReactElement | null => {
        if (isJoinRequest) {
            return null;
        }
        const expiredInvitations = (currentCollaboration.invitations || []).some((inv: CollaborationInvitationSummary) => isInvitationExpired(inv));
        return (<CollaborationTabPane key="members" name="members"
                                      label={I18n.t("home.tabs.members")}
                                      readOnly={isJoinRequest}
                                      notifier={expiredInvitations && !currentShowMemberView}>
            {!isJoinRequest && <CollaborationAdmins {...props}
                                                    collaboration={currentCollaboration}
                                                    isAdminView={false}
                                                    tabChanged={tabChanged}
                                                    showMemberView={currentShowMemberView}
                                                    refresh={(callback?: () => void) => loadCollaboration(callback)}/>}
        </CollaborationTabPane>);
    };

    const getGroupsTab = (currentCollaboration: CollaborationDetailModel, currentShowMemberView: boolean, isJoinRequest = false): ReactElement | null => {
        if (isJoinRequest) {
            return null;
        }
        return (<CollaborationTabPane key="groups" name="groups"
                                      label={I18n.t("home.tabs.groups", {count: (currentCollaboration.groups || []).length})}
                                      readOnly={isJoinRequest}
        >
            {!isJoinRequest && <Groups {...props}
                                       collaboration={currentCollaboration}
                                       groupId={groupId}
                                       showMemberView={currentShowMemberView}
                                       refresh={(callback?: () => void) => loadCollaboration(callback)}/>}
        </CollaborationTabPane>);
    };

    const getUserTokensTab = (
        currentUserTokens: CollaborationUserToken[],
        currentCollaboration: CollaborationDetailModel,
        services: CollaborationDetailModel["services"]
    ): ReactElement => {
        return (
            <CollaborationTabPane key="tokens"
                                  name="tokens"
                                  label={I18n.t("home.tabs.userTokens", {count: (currentUserTokens || []).length})}>
                {<UserTokens {...props}
                             collaboration={currentCollaboration}
                             services={services}
                             userTokens={currentUserTokens}
                             refresh={(callback?: () => void) => loadCollaboration(callback)}/>}
            </CollaborationTabPane>
        );
    };

    const getJoinRequestsTab = (currentCollaboration: CollaborationDetailModel): ReactElement | null => {
        const openJoinRequests = (currentCollaboration.join_requests || []).filter(jr => jr.status === "open").length;
        if (currentCollaboration.disable_join_requests) {
            return null;
        }
        return (<CollaborationTabPane key="joinrequests"
                                      name="joinrequests"
                                      label={I18n.t("home.tabs.joinRequests", {count: (currentCollaboration.join_requests || []).length})}
                                      notifier={openJoinRequests > 0 ? openJoinRequests : null}>
            <JoinRequests collaboration={currentCollaboration}
                          refresh={(callback?: () => void) => loadCollaboration(callback)}
                          {...props} />
        </CollaborationTabPane>);
    };

    const getServicesTab = (currentCollaboration: CollaborationDetailModel, currentUser: CollaborationHeaderUser): ReactElement => {
        const usedServices = currentCollaboration.services;
        const openServiceConnectionRequests = (currentCollaboration.service_connection_requests || [])
            .filter(r => r.status === "open")
            .length;
        return (<CollaborationTabPane key="services"
                                      name="services"
                                      label={I18n.t("home.tabs.coServices", {count: usedServices.length})}
                                      notifier={openServiceConnectionRequests > 0 ? openServiceConnectionRequests : null}>
            <UsedServices {...props}
                          collaboration={currentCollaboration}
                          user={currentUser}
                          refresh={(callback?: () => void) => loadCollaboration(callback)}/>
        </CollaborationTabPane>);
    };

    const getAboutTab = (currentCollaboration: CollaborationDetailModel, currentShowMemberView: boolean, isJoinRequest = false): ReactElement => {
        return (<CollaborationTabPane key="about"
                                      name="about"
                                      label={I18n.t("home.tabs.about")}>
            <AboutCollaboration showMemberView={currentShowMemberView}
                                collaboration={currentCollaboration}
                                isJoinRequest={isJoinRequest}
                                tabChanged={tabChanged}
                                {...props} />
        </CollaborationTabPane>);
    };

    const getTabs = (
        currentCollaboration: CollaborationDetailModel,
        currentUserTokens: CollaborationUserToken[] | null,
        _schacHomeOrganisations: unknown,
        currentAdminOfCollaboration: boolean,
        currentShowMemberView: boolean,
        isJoinRequest = false
    ): ReactElement[] => {
        if (!isJoinRequest && !userIsAllowed(ROLES.COLL_MEMBER, user, currentCollaboration.organisation_id, currentCollaboration.id)) {
            return [];
        }
        const services = isJoinRequest ? [] : currentCollaboration.services
            .filter(s => s.token_enabled);
        if ((!currentAdminOfCollaboration || currentShowMemberView) && !currentCollaboration.disclose_member_information) {
            const minimalTabs = [getAboutTab(currentCollaboration, currentShowMemberView, isJoinRequest)];
            addUserTokenTab(currentUserTokens, services, isJoinRequest, minimalTabs, currentCollaboration);
            return minimalTabs;
        }
        const tabs: Array<ReactElement | null> = (currentAdminOfCollaboration && !currentShowMemberView) ? [
                getAboutTab(currentCollaboration, currentShowMemberView, isJoinRequest),
                getCollaborationAdminsTab(currentCollaboration),
                getMembersTab(currentCollaboration, currentShowMemberView),
                getGroupsTab(currentCollaboration, currentShowMemberView),
                getServicesTab(currentCollaboration, user),
                getJoinRequestsTab(currentCollaboration)] :
            [getAboutTab(currentCollaboration, currentShowMemberView, isJoinRequest),
                getMembersTab(currentCollaboration, currentShowMemberView, isJoinRequest),
                getGroupsTab(currentCollaboration, currentShowMemberView, isJoinRequest)];
        addUserTokenTab(currentUserTokens, services, isJoinRequest, tabs, currentCollaboration);

        return tabs.filter((currentTab): currentTab is ReactElement => currentTab !== null);
    };

    useImperativeHandle(ref, () => ({
        componentDidMount: loadCollaboration,
        tabChanged,
        doAcceptInvitation,
        getTabs
    }));

    if (loading || !collaboration) {
        return <SpinnerField/>;
    }

    const allowedToEdit = userIsAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id);
    let role;
    if (isInvitation && invitation) {
        role = invitation.intended_role === "admin" ? ROLES.COLL_ADMIN : ROLES.COLL_MEMBER;
    } else {
        role = adminOfCollaboration ? ROLES.COLL_ADMIN : ROLES.COLL_MEMBER;
    }

    // The class component stored tabs in state and called getTabs(showMemberView=false) on load
    // while showMemberView state stayed true. Toggle then passed the previous showMemberView.
    // Deriving with !showMemberView keeps that inverted argument.
    const tabs = isInvitation
        ? [getAboutTab(collaboration, true, false)]
        : getTabs(
            collaboration,
            userTokens,
            schacHomeOrganisations,
            adminOfCollaboration,
            collaborationJoinRequest ? false : !showMemberView,
            collaborationJoinRequest
        );

    return (<>
        <CollaborationPageHeader
            collaboration={collaboration}
            user={user}
            history={history}
            allowedToEdit={allowedToEdit}
            adminOfCollaboration={adminOfCollaboration}
            showMemberView={showMemberView}
            collaborationJoinRequest={collaborationJoinRequest}
            alreadyMember={alreadyMember}
            onLeave={deleteMe}
            onAddMe={addMe}
            onToggleView={toggleAdminMemberView}
            onBoarding={onBoarding}
            onOpenJoinRequest={() => setJoinRequestDialogOpen(true)}
        />

        {(!collaborationJoinRequest && !alreadyCollaborationMembership) &&
            <CollaborationWelcomeDialog name={collaboration.name}
                                        isOpen={firstTime}
                                        role={role}
                                        serviceEmails={serviceEmails}
                                        adminEmails={adminEmails}
                                        collaboration={collaboration}
                                        user={user}
                                        close={doAcceptInvitation}
                                        {...{isAdmin: user.admin, isInvitation}}/>}
        {alreadyCollaborationMembership && invitation &&
            <TypedConfirmationDialog isOpen={true}
                                     confirm={() => alreadyMemberConfirmation(invitation)}
                                     confirmationHeader={I18n.t("organisationMembership.alreadyMemberHeader")}
                                     confirmationTxt={I18n.t("confirmationDialog.ok")}
                                     question={I18n.t("organisationMembership.alreadyMember")}/>
        }
        <JoinRequestDialog collaboration={collaboration}
                           isOpen={joinRequestDialogOpen}
                           user={user}
                           serviceEmails={serviceEmails}
                           adminEmails={adminEmails}
                           refresh={(callback?: () => void) => refreshUser(callback)}
                           history={history}
                           close={() => setJoinRequestDialogOpen(false)}/>

        <TypedConfirmationDialog isOpen={confirmationDialogOpen}
                                 cancel={cancelDialogAction}
                                 confirm={confirmationDialogAction}
                                 isWarning={isWarning}
                                 question={confirmationQuestion}>
            {lastAdminWarning ? <LastAdminWarning organisation={collaboration.organisation} currentUserDeleted={true}/> : null}
        </TypedConfirmationDialog>
        <Tabs activeTab={tab} tabChanged={tabChanged}>
            {tabs}
        </Tabs>

    </>);
});

CollaborationDetail.displayName = "CollaborationDetail";
