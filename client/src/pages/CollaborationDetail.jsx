import React from "react";
import {
    activateCollaboration,
    collaborationAccessAllowed,
    collaborationById,
    collaborationByIdentifier,
    collaborationIdByIdentifier,
    collaborationLiteById,
    createCollaborationMembershipRole,
    deleteCollaborationMembership,
    health,
    invitationAccept,
    invitationByHash,
    unsuspendCollaboration,
    userTokensOfUser
} from "../api";
import "./CollaborationDetail.scss";
import I18n from "../locale/I18n";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as ShortNameIcon} from "../icons/short-name.svg";
import {ReactComponent as MemberIcon} from "../icons/groups.svg";
import {ReactComponent as TimerIcon} from "../icons/streamline/timer2.svg";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import {ReactComponent as WebsiteIcon} from "../icons/network-information.svg";
import {ReactComponent as CopyIcon} from "../icons/duplicate.svg";
import {ReactComponent as UserTokensIcon} from "../icons/connections.svg";
import {ReactComponent as MemberStatusIcon} from "@surfnet/sds/icons/functional-icons/id-2.svg";
import {ReactComponent as JoinRequestsIcon} from "../icons/single-neutral-question.svg";
import {ReactComponent as AboutIcon} from "../icons/common-file-text-home.svg";
import CollaborationAdmins from "../components/redesign/CollaborationAdmins";
import SpinnerField from "../components/redesign/SpinnerField";
import UsedServices from "../components/redesign/UsedServices";
import Groups from "../components/redesign/Groups";
import AboutCollaboration from "../components/redesign/AboutCollaboration";
import {actionMenuUserRole, isUserAllowed, ROLES} from "../utils/UserRole";
import {getParameterByName} from "../utils/QueryParameters";
import CollaborationWelcomeDialog from "../components/CollaborationWelcomeDialog";
import JoinRequests from "../components/redesign/JoinRequests";
import {clearFlash, setFlash} from "../utils/Flash";
import ConfirmationDialog from "../components/ConfirmationDialog";
import Button from "../components/Button";
import JoinRequestDialog from "../components/JoinRequestDialog";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import moment from "moment";
import {ButtonType, Tooltip} from "@surfnet/sds";
import {ErrorOrigins, isEmpty, removeDuplicates, stopEvent} from "../utils/Utils";
import UserTokens from "../components/redesign/UserTokens";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../utils/SocketIO";
import {isUuid4} from "../validations/regExps";
import {isInvitationExpired} from "../utils/Date";

class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roleOptions = collaborationRoles.map(role => ({
            value: role, label: I18n.t(`profile.${role}`)
        }));
        this.state = {
            invitation: null,
            serviceEmails: {},
            collaboration: null,
            schacHomeOrganisation: null,
            userTokens: null,
            adminOfCollaboration: false,
            collaborationJoinRequest: false,
            showMemberView: true,
            alreadyMember: false,
            loading: true,
            firstTime: false,
            isInvitation: false,
            tab: "about",
            tabs: [],
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            lastAdminWarning: "",
            joinRequestDialogOpen: false,
            socketSubscribed: false
        }
    }

    componentWillUnmount = () => {
        clearFlash();
        AppStore.update(s => {
            s.objectRole = null;
            s.actions = [];
        });
        const params = this.props.match.params;
        const {collaboration} = this.state;
        if (params.id && collaboration) {
            [`collaboration_${collaboration.id}`, "service", `organisation_${collaboration.organisation_id}`]
                .forEach(topic => socket.then(s => s.off(topic)));
        }
    }

    componentDidMount = callback => {
        const params = this.props.match.params;
        if (params.hash) {
            invitationByHash(params.hash, true).then(res => {
                const invitation = res["invitation"];
                const serviceEmails = res["service_emails"];
                this.setState({
                    invitation: invitation,
                    collaboration: invitation.collaboration,
                    serviceEmails: serviceEmails,
                    loading: false,
                    firstTime: true,
                    adminOfCollaboration: false,
                    schacHomeOrganisation: "",
                    confirmationDialogOpen: false,
                    tab: "about",
                    isInvitation: true,
                    tabs: [this.getAboutTab(invitation.collaboration, true, false)]
                });
            }).catch(() => this.props.history.push(`/404?eo=${ErrorOrigins.invitationNotFound}`));
        } else if (params.id) {
            if (isUuid4(params.id)) {
                collaborationIdByIdentifier(params.id).then(res => {
                    const path = encodeURIComponent(`/collaborations/${res.id}`);
                    this.props.history.push(`/refresh-route/${path}`);
                });
                return;
            }
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const adminOfCollaboration = json.access === "full";
                    const promises = adminOfCollaboration ? [collaborationById(collaboration_id), userTokensOfUser()] : [collaborationLiteById(collaboration_id), userTokensOfUser()];
                    Promise.all(promises)
                        .then(res => {
                            const {user, config} = this.props;
                            const tab = params.tab || (adminOfCollaboration ? this.state.tab : "members");
                            const collaboration = res[0];
                            const userTokens = res[1];
                            const schacHomeOrganisation = adminOfCollaboration ? null : user.organisation_from_user_schac_home;
                            const orgManager = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id, null);
                            const firstTime = getParameterByName("first", window.location.search) === "true";
                            this.showExpiryDateFlash(user, collaboration, config, true);

                            this.setState({
                                collaboration: collaboration,
                                userTokens: userTokens,
                                adminOfCollaboration: adminOfCollaboration,
                                schacHomeOrganisation: schacHomeOrganisation,
                                loading: false,
                                orgManager: orgManager,
                                confirmationDialogOpen: false,
                                firstTime: firstTime,
                                tabs: this.getTabs(collaboration, userTokens, schacHomeOrganisation, adminOfCollaboration, false),
                                tab: tab,
                            }, () => {
                                callback && callback();
                                this.tabChanged(tab, collaboration.id);
                            });
                            const {socketSubscribed} = this.state;
                            if (!socketSubscribed) {
                                [`collaboration_${collaboration.id}`, "service", `organisation_${collaboration.organisation_id}`]
                                    .forEach(topic => {
                                        socket.then(s => s.on(topic, data => {
                                            const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                                            if (subscriptionIdSessionStorage !== data.subscription_id) {
                                                this.props.refreshUser(() => this.componentDidMount());
                                            }
                                        }));
                                    })
                                this.setState({socketSubscribed: true})
                            }
                        }).catch(() => {
                        this.props.history.push("/404")
                    });
                }).catch(() => this.props.history.push("/404"));
        } else {
            const {collaborationIdentifier, user} = this.props;
            if (!collaborationIdentifier) {
                this.props.history.push("/404");
            } else {
                collaborationByIdentifier(collaborationIdentifier)
                    .then(res => {
                        const collaboration = res;
                        if (collaboration.disable_join_requests) {
                            this.props.history.push("/404");
                        } else {
                            const alreadyMember = user.collaboration_memberships.some(m => m.collaboration_id === collaboration.id);
                            if (alreadyMember) {
                                setFlash(I18n.t("registration.alreadyMember", {name: collaboration.name}), "error");
                            }
                            this.setState({
                                collaboration: collaboration,
                                collaborationJoinRequest: true,
                                alreadyMember: alreadyMember,
                                adminOfCollaboration: false,
                                schacHomeOrganisation: null,
                                loading: false,
                                confirmationDialogOpen: false,
                                tabs: this.getTabs(collaboration, null, null, false, false, true),
                                tab: "about",
                            }, () => {
                                AppStore.update(s => {
                                    s.breadcrumb.paths = [{
                                        path: "/home?redirect=false",
                                        value: I18n.t("breadcrumb.home")
                                    }, {value: I18n.t("breadcrumb.collaborationJoinRequest", {name: collaboration.name})}]
                                    s.objectRole = actionMenuUserRole(user, collaboration.organisation, collaboration, null, true);
                                });
                            })
                        }
                    }).catch(() => {
                    this.props.history.push("/404")
                });
            }
        }
    }

    isExpiryDateWarning = expiry_date => {
        const today = new Date().getTime();
        const expiryDate = expiry_date * 1000;
        const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
        return days < 60;
    }

    mailToAdmins = (collaboration, title) => {
        const a = document.createElement('a');

        const mails = collaboration.collaboration_memberships
            .filter(membership => membership.role === "admin")
            .map(membership => membership.user.email)
            .join(",");
        a.href = `mailto:${mails}?subject=${encodeURIComponent(title)}`;
        a.click();
    }

    hasCollaborationAdmin = collaboration => {
        return collaboration.collaboration_memberships
            .some(membership => membership.role === "admin");
    }

    showExpiryDateFlash = (user, collaboration, config, showMemberView) => {
        let msg = "";
        let action = null;
        let actionLabel = null;
        const membership = collaboration.collaboration_memberships.find(m => m.user_id === user.id);
        const isMember = !isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id);
        if (membership && membership.expiry_date) {
            const formattedMembershipExpiryDate = moment(membership.expiry_date * 1000).format("LL");
            if (membership.status === "expired") {
                msg += I18n.t(`organisationMembership.status.expiredTooltip${isMember ? "Member" : ""}`, {date: formattedMembershipExpiryDate});
                if (isMember && showMemberView && this.hasCollaborationAdmin(collaboration)) {
                    action = () => this.mailToAdmins(collaboration, I18n.t("collaboration.status.askForReactivationSubject", {email: membership.user.email}));
                    actionLabel = I18n.t("collaboration.status.askForReactivation");
                }
            } else if (this.isExpiryDateWarning(membership.expiry_date)) {
                msg += I18n.t("organisationMembership.status.activeWithExpiryDateTooltip", {date: formattedMembershipExpiryDate});
                if (isMember && showMemberView && this.hasCollaborationAdmin(collaboration)) {
                    action = () => this.mailToAdmins(collaboration, I18n.t("collaboration.status.askForExtensionSubject", {email: membership.user.email}));
                    actionLabel = I18n.t("collaboration.status.askForExtension");
                }
            }
        }
        if (collaboration && collaboration.expiry_date) {
            const formattedCollaborationExpiryDate = moment(collaboration.expiry_date * 1000).format("LL");
            if (collaboration.status === "expired") {
                msg += I18n.t("collaboration.status.expiredTooltip", {expiryDate: formattedCollaborationExpiryDate});
                if (!isMember && showMemberView) {
                    action = this.activate(true);
                    actionLabel = I18n.t("collaboration.status.activate");
                }
            } else if (this.isExpiryDateWarning(collaboration.expiry_date)) {
                msg += I18n.t("collaboration.status.activeWithExpiryDateTooltip", {expiryDate: formattedCollaborationExpiryDate});
                if (!isMember && showMemberView) {
                    action = () => this.props.history.push(`/edit-collaboration/${collaboration.id}`)
                    actionLabel = I18n.t("collaboration.status.activeWithExpiryDateAction");
                }
            }
        }
        if (collaboration && collaboration.status === "suspended") {
            msg += I18n.t("collaboration.status.suspendedTooltip", {
                lastActivityDate: moment(collaboration.last_activity_date * 1000).format("LL")
            });
            if (!isMember && showMemberView) {
                action = this.unsuspend(true);
                actionLabel = I18n.t("home.unsuspend");
            }
        }
        if (collaboration && collaboration.last_activity_date) {
            const almostSuspended = this.isCollaborationAlmostSuspended(user, collaboration, config)
            if (almostSuspended) {
                msg += I18n.t("collaboration.status.almostSuspended", {
                    days: almostSuspended
                });
                if (!isMember && showMemberView) {
                    action = this.unsuspend(true);
                    actionLabel = I18n.t("home.avoidSuspending");
                }
            }
        }
        if (!isEmpty(msg)) {
            setFlash(msg, "warning", action, actionLabel);
        }
    }

    isCollaborationAlmostSuspended = (user, collaboration, config) => {
        const threshold = config.threshold_for_collaboration_inactivity_warning;
        const lastActivityDate = new Date(collaboration.last_activity_date * 1000);
        const now = new Date();
        now.setDate(now.getDate() - threshold);
        if (lastActivityDate <= now && collaboration.status === "active") {
            return Math.round((now.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24))
        }
        return false;
    }

    updateAppStore = (user, config, collaboration, adminOfCollaboration, orgManager) => {
        AppStore.update(s => {
            s.breadcrumb.paths = orgManager ? [{path: "/", value: I18n.t("breadcrumb.home")}, {
                    path: `/organisations/${collaboration.organisation_id}`,
                    value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name})
                }, {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}]
                : [{
                    path: "/?redirect=false",
                    value: I18n.t("breadcrumb.home")
                }, {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}];
            s.actions = this.getHeaderActions(user, config, collaboration);
            s.objectRole = actionMenuUserRole(user, collaboration.organisation, collaboration, null, true);
        });
    }

    toggleAdminMemberView = () => {
        health().then(() => {
            const {showMemberView, collaboration, schacHomeOrganisation, userTokens, adminOfCollaboration} = this.state;
            const {config, user} = this.props;
            const newTab = showMemberView ? "about" : "admins";
            this.tabChanged(newTab, collaboration.id);
            this.showExpiryDateFlash(user, collaboration, config, !showMemberView);
            this.setState({
                showMemberView: !showMemberView,
                tabs: this.getTabs(collaboration, userTokens, schacHomeOrganisation, adminOfCollaboration, showMemberView),
                tab: newTab
            });
        });
    }

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    getTabs = (collaboration, userTokens, schacHomeOrganisation, adminOfCollaboration, showMemberView, isJoinRequest = false) => {
        const {user} = this.props;
        if (!isJoinRequest && !isUserAllowed(ROLES.COLL_MEMBER, user, collaboration.organisation_id, collaboration.id)) {
            return [];
        }
        const services = isJoinRequest ? [] : removeDuplicates(collaboration.services.concat(collaboration.organisation.services)
            .filter(s => s.token_enabled), "id");
        //Actually this collaboration is not for members to view
        if ((!adminOfCollaboration || showMemberView) && !collaboration.disclose_member_information) {
            const minimalTabs = [this.getAboutTab(collaboration, showMemberView, isJoinRequest),];
            this.addUserTokenTab(userTokens, services, isJoinRequest, minimalTabs, collaboration);
            return minimalTabs;
        }
        const tabs = (adminOfCollaboration && !showMemberView) ? [
                this.getAboutTab(collaboration, showMemberView, isJoinRequest),
                this.getCollaborationAdminsTab(collaboration),
                this.getMembersTab(collaboration, showMemberView),
                this.getGroupsTab(collaboration, showMemberView),
                this.getServicesTab(collaboration, user),
                this.getJoinRequestsTab(collaboration),] :
            [this.getAboutTab(collaboration, showMemberView, isJoinRequest),
                this.getMembersTab(collaboration, showMemberView, isJoinRequest),
                this.getGroupsTab(collaboration, showMemberView, isJoinRequest),];
        this.addUserTokenTab(userTokens, services, isJoinRequest, tabs, collaboration);

        return tabs.filter(tab => tab !== null);
    }

    addUserTokenTab(userTokens, services, isJoinRequest, tabs, collaboration) {
        if (userTokens) {
            userTokens = userTokens.filter(userToken => services.find(service => service.id === userToken.service_id));
            if (!isJoinRequest && services.length > 0) {
                tabs.push(this.getUserTokensTab(userTokens, collaboration, services))
            }
        }
    }

    getCollaborationAdminsTab = collaboration => {
        const expiredInvitations = (collaboration.invitations || []).some(inv => isInvitationExpired(inv));
        return (<div key="admins"
                     name="admins"
                     label={I18n.t("home.tabs.coAdmins")}
                     icon={<CoAdminIcon/>}
                     notifier={expiredInvitations}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={true}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getMembersTab = (collaboration, showMemberView, isJoinRequest = false) => {
        const expiredInvitations = (collaboration.invitations || []).some(inv => isInvitationExpired(inv));
        return (<div key="members" name="members"
                     label={I18n.t("home.tabs.members")}
                     icon={<MemberIcon/>}
                     readOnly={isJoinRequest}
                     notifier={expiredInvitations && !showMemberView}>
            {!isJoinRequest && <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={false}
                                                    showMemberView={showMemberView}
                                                    refresh={callback => this.componentDidMount(callback)}/>}
        </div>)
    }

    getGroupsTab = (collaboration, showMemberView, isJoinRequest = false) => {
        return (<div key="groups" name="groups"
                     label={I18n.t("home.tabs.groups", {count: (collaboration.groups || []).length})}
                     readOnly={isJoinRequest}
                     icon={<GroupsIcon/>}>
            {!isJoinRequest && <Groups {...this.props} collaboration={collaboration} showMemberView={showMemberView}
                                       refresh={callback => this.componentDidMount(callback)}/>}
        </div>)
    }

    getUserTokensTab = (userTokens, collaboration, services) => {
        return (<div key="tokens" name="tokens"
                     label={I18n.t("home.tabs.userTokens", {count: (userTokens || []).length})}
                     icon={<UserTokensIcon/>}>
            {<UserTokens {...this.props}
                         collaboration={collaboration}
                         services={services}
                         userTokens={userTokens}
                         refresh={callback => this.componentDidMount(callback)}/>}
        </div>)
    }

    getJoinRequestsTab = (collaboration) => {
        const openJoinRequests = (collaboration.join_requests || []).filter(jr => jr.status === "open").length;
        if (collaboration.disable_join_requests) {
            return null;
        }
        return (<div key="joinrequests"
                     name="joinrequests"
                     label={I18n.t("home.tabs.joinRequests", {count: (collaboration.join_requests || []).length})}
                     icon={<JoinRequestsIcon/>}
                     notifier={openJoinRequests > 0 ? openJoinRequests : null}>
            <JoinRequests collaboration={collaboration}
                          refresh={callback => this.componentDidMount(callback)}
                          {...this.props} />
        </div>)
    }

    getServicesTab = (collaboration, user) => {
        const usedServices = removeDuplicates(collaboration.services.concat(collaboration.organisation.services), "id");
        const openServiceConnectionRequests = (collaboration.service_connection_requests || []).length;
        return (<div key="services" name="services"
                     label={I18n.t("home.tabs.coServices", {count: usedServices.length})}
                     icon={<ServicesIcon/>}
                     notifier={openServiceConnectionRequests > 0 ? openServiceConnectionRequests : null}>
            <UsedServices collaboration={collaboration}
                          user={user}
                          refresh={callback => this.componentDidMount(callback)}
                          {...this.props} />
        </div>);
    }

    getAboutTab = (collaboration, showMemberView, isJoinRequest = false) => {
        return (<div key="about" name="about" label={I18n.t("home.tabs.about")} icon={<AboutIcon/>}>
            <AboutCollaboration showMemberView={showMemberView}
                                collaboration={collaboration}
                                isJoinRequest={isJoinRequest}
                                tabChanged={this.tabChanged}
                                {...this.props} />
        </div>);
    }

    doDeleteMe = () => {
        const {user} = this.props;
        const {collaboration} = this.state;
        this.setState({confirmationDialogOpen: false, loading: true});
        deleteCollaborationMembership(collaboration.id, user.id)
            .then(() => {
                this.props.refreshUser(() => {
                    const canStay = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id);
                    setFlash(I18n.t("organisationDetail.flash.memberDeleted", {name: user.name}));
                    if (canStay) {
                        this.componentDidMount();
                    } else {
                        this.props.history.push("/home");
                    }
                });
            });
    };

    deleteMe = e => {
        stopEvent(e);
        const {user} = this.props;
        const {collaboration} = this.state;
        const admins = collaboration.collaboration_memberships.filter(m => m.role === "admin");
        const lastAdminWarning = admins.length === 1 && admins[0].user_id === user.id;
        const canStay = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id);
        if (!canStay || lastAdminWarning) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("collaborationDetail.deleteYourselfMemberConfirmation"),
                confirmationDialogAction: this.doDeleteMe,
                lastAdminWarning: lastAdminWarning,
                isWarning: true
            });
        } else {
            this.doDeleteMe();
        }
    };

    tabChanged = (name, id) => {
        const collId = id || this.state.collaboration.id;
        const {collaboration, adminOfCollaboration, orgManager} = this.state;
        const {user, config} = this.props;
        if (collaboration) {
            this.updateAppStore(user, config, collaboration, adminOfCollaboration, orgManager);
        }
        this.setState({tab: name}, () => this.props.history.replace(`/collaborations/${collId}/${name}`));
    }


    getAdminHeader = (collaboration) => {
        const admins = collaboration.collaboration_memberships
            .filter(m => m.role === "admin")
            .map(m => m.user);

        if (admins.length === 0) {
            return I18n.t("models.collaboration.noAdminsHeader");
        }
        const mails = admins.map(u => u.email).join(",");
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc=";
        if (admins.length === 1) {
            return I18n.t("models.collaboration.adminsHeader", {name: admins[0].name, mails: mails, bcc: bcc});
        }
        const twoOrMore = admins.length === 2 ? "twoAdminsHeader" : "multipleAdminsHeader";
        return I18n.t(`models.collaboration.${twoOrMore}`, {
            name: admins[0].name, mails: mails, bcc: bcc, nbr: admins.length - 1
        });
    }

    collaborationJoinRequestAction = (collaboration, alreadyMember) => {
        return (<div className="join-request-action">
            <Button txt={I18n.t("registration.joinRequest", {name: collaboration.name})}
                    disabled={alreadyMember}
                    onClick={() => this.setState({joinRequestDialogOpen: true})}/>
        </div>);
    }

    getIconListItems = iconListItems => {
        return (<div className={"icon-list-items"}>
            {iconListItems.map((item, index) => <div className={"icon-list-item"} key={index}>
                {item.Icon}
                {item.value}
            </div>)}
        </div>);
    }

    getShortNameIconListItem = collaboration => {
        return (
            {
                Icon: <ShortNameIcon/>,
                value: <span>{collaboration.short_name}</span>
            }
        );
    }

    getMemberIconListItem = collaboration => {
        const memberCount = collaboration.collaboration_memberships.length;
        const groupCount = collaboration.groups.length;
        return (
            {
                Icon: <MemberIcon/>, value: <span>{I18n.t("coPageHeaders.membersGroups", {
                    memberCount: memberCount === 0 ? I18n.t("coPageHeaders.no") : memberCount,
                    members: memberCount === 1 ? I18n.t("coPageHeaders.singleMember") : I18n.t("coPageHeaders.multipleMembers"),
                    groupCount: groupCount === 0 ? I18n.t("coPageHeaders.no").toLowerCase() : groupCount,
                    groups: groupCount === 1 ? I18n.t("coPageHeaders.singleGroup") : I18n.t("coPageHeaders.multipleGroups"),
                })}
                </span>
            }
        );
    }

    getUnitHeaderForMemberNew = (user, config, collaboration, allowedToEdit, showMemberView, collaborationJoinRequest, alreadyMember, adminOfCollaboration) => {
        const customAction = collaborationJoinRequest ? this.collaborationJoinRequestAction(collaboration, alreadyMember) : null;
        const iconListItems = [
            this.getShortNameIconListItem(collaboration),
            this.getMemberIconListItem(collaboration)
        ];
        if (collaboration.website_url) {
            iconListItems.push({
                Icon: <WebsiteIcon/>,
                value: <a href={collaboration.website_url} target="_blank" rel="noopener noreferrer">
                    {I18n.t("coPageHeaders.visit")}
                </a>
            })
        }
        const membershipStatus = this.getMembershipStatus(collaboration, user);
        if (!collaborationJoinRequest && membershipStatus) {
            iconListItems.push({
                Icon: <MemberStatusIcon/>, value: membershipStatus
            })
        }
        return <UnitHeader obj={collaboration}
                           actions={collaborationJoinRequest ? [] : this.getActions(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}
                           name={collaboration.name}
                           displayDescription={false}
                           customAction={customAction}>
            {this.getIconListItems(iconListItems)}
        </UnitHeader>;
    }

    unsuspend = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("unsuspend.confirmation"),
                confirmationDialogAction: this.unsuspend(false),
                isWarning: false
            });
        } else {
            this.setState({loading: true});
            unsuspendCollaboration(this.state.collaboration.id).then(() => {
                this.componentDidMount(() => {
                    this.setState({loading: false});
                    setFlash(I18n.t("unsuspend.flash", {name: this.state.collaboration.name}));
                })
            });
        }
    }

    activate = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("activate.confirmation"),
                confirmationDialogAction: this.activate(false),
                isWarning: false
            });
        } else {
            this.setState({loading: true});
            activateCollaboration(this.state.collaboration.id).then(() => {
                this.componentDidMount(() => {
                    this.setState({loading: false});
                    setFlash(I18n.t("activate.flash", {name: this.state.collaboration.name}));
                })
            });
        }
    }

    resetLastActivityDate = showConfirmation => () => {
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t("resetActivity.confirmation"),
                confirmationDialogAction: this.resetLastActivityDate(false),
                isWarning: false
            });
        } else {
            this.setState({loading: true});
            unsuspendCollaboration(this.state.collaboration.id).then(() => {
                this.componentDidMount(() => {
                    this.setState({loading: false});
                    setFlash(I18n.t("resetActivity.flash", {name: this.state.collaboration.name}));
                })
            });
        }
    }

    getHeaderActions = (user, config, collaboration) => {
        const actions = [];
        const isMember = collaboration.collaboration_memberships.some(m => m.user_id === user.id);
        if (isMember) {
            actions.push({
                name: I18n.t("models.collaboration.leave"),
                perform: this.deleteMe
            });
        }
        return actions;
    }

    getActions = (user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration) => {
        const actions = [];
        if (allowedToEdit && showMemberView) {
            actions.push({
                buttonType: ButtonType.Primary, name: I18n.t("home.edit"), perform: () => {
                    clearFlash();
                    this.props.history.push("/edit-collaboration/" + collaboration.id)
                }
            });
        }
        if (adminOfCollaboration) {
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t(`models.collaboration.${showMemberView ? "viewAsMember" : "viewAsAdmin"}`),
                perform: () => this.toggleAdminMemberView()
            });
        }
        if (adminOfCollaboration && !user.admin && showMemberView) {
            const queryParam = `name=${encodeURIComponent(collaboration.name)}&back=${encodeURIComponent(window.location.pathname)}`;
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t("home.history"),
                perform: () => this.props.history.push(`/audit-logs/collaborations/${collaboration.id}?${queryParam}`)
            });
        }
        const isMember = collaboration.collaboration_memberships.some(m => m.user_id === user.id);
        if (!isMember && user.admin && showMemberView) {
            actions.push({
                buttonType: ButtonType.Chevron, name: I18n.t("collaborationDetail.addMe"),
                perform: this.addMe
            })
        }
        return actions;
    }

    addMe = e => {
        stopEvent(e);
        const {collaboration} = this.state;
        this.setState({loading: true});
        createCollaborationMembershipRole(collaboration.id).then(() => {
            this.componentDidMount(() => {
                this.setState({loading: false});
                setFlash(I18n.t("collaborationDetail.flash.meAdded", {name: collaboration.name}));
            });
        })
    }

    getCollaborationStatus = collaboration => {
        if (!collaboration.expiry_date) {
            return null;
        }
        const expiryDate = moment(collaboration.expiry_date * 1000).format("LL");
        const status = (collaboration.status === "active" && collaboration.expiry_date) ? "activeWithExpiryDate" : collaboration.status;
        return (<span>
                    {I18n.t(`collaboration.status.${status}`, {expiryDate: expiryDate})}
                </span>);
    }

    doAcceptInvitation = () => {
        const {invitation, isInvitation} = this.state;
        if (isInvitation) {
            invitationAccept(invitation).then(() => {
                this.props.refreshUser(() => {
                    const path = encodeURIComponent(`/collaborations/${invitation.collaboration_id}`);
                    this.props.history.push(`/refresh-route/${path}`);
                });
            }).catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(res => {
                        if (res.message && res.message.indexOf("already a member") > -1) {
                            this.setState({
                                errorOccurred: true,
                                firstTime: false
                            }, () => setFlash(I18n.t("invitation.flash.alreadyMember", {"name": invitation.collaboration.name}), "error"));
                        }
                    });
                } else {
                    throw e;
                }
            });
        } else {
            this.setState({firstTime: false});
        }
    }

    getMembershipStatus = (collaboration, user) => {
        if (!user || !collaboration) {
            return null;
        }
        const membership = collaboration.collaboration_memberships.find(cm => cm.user_id === user.id);
        if (!membership) {
            return null;
        }
        //expiryDate is only used for translation if actually set
        const expiryDate = membership.expiry_date ? moment(membership.expiry_date * 1000).format("LL") : null;
        if (membership.status === "active") {
            return (<span>
                {I18n.t("coPageHeaders.membership", {date: moment(membership.created_at * 1000).format("LL")})}
                {expiryDate && <Tooltip tip={I18n.t("coPageHeaders.expiresTooltip", {date: expiryDate})}/>}
            </span>)
        }
        return <span>{I18n.t("collaboration.status.expired")}</span>
    }

    getUnitHeader = (user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration) => {
        const joinRequestUrl = `${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`;
        const iconListItems = [
            this.getShortNameIconListItem(collaboration),
            this.getMemberIconListItem(collaboration)
        ];
        if (collaboration.website_url) {
            iconListItems.push({
                Icon: <WebsiteIcon/>,
                value: <a href={collaboration.website_url} target="_blank" rel="noopener noreferrer">
                    {I18n.t("coPageHeaders.visit")}
                </a>
            })
        }

        if (!collaboration.disable_join_requests) {
            iconListItems.push({
                Icon: <CopyIcon/>,
                value: <a href={joinRequestUrl} target="_blank" rel="noopener noreferrer">
                    {I18n.t("collaboration.joinRequestsHeader")}
                </a>
            });
        }
        const collaborationStatus = this.getCollaborationStatus(collaboration);
        if (collaborationStatus) {
            iconListItems.push({
                Icon: <TimerIcon/>, value: collaborationStatus
            })
        }
        return (<UnitHeader obj={collaboration}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            history={(user.admin && allowedToEdit) && this.props.history}
                            auditLogPath={`collaborations/${collaboration.id}`}
                            breadcrumbName={I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
                            name={collaboration.name}
                            labels={collaboration.tags.map(tag => tag.tag_value)}
                            displayDescription={false}
                            actions={this.getActions(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}>
            {this.getIconListItems(iconListItems)}
        </UnitHeader>);
    }

    render() {
        const {
            collaboration,
            loading,
            tabs,
            tab,
            adminOfCollaboration,
            showMemberView,
            firstTime,
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationQuestion,
            collaborationJoinRequest,
            joinRequestDialogOpen,
            alreadyMember,
            lastAdminWarning,
            isWarning,
            isInvitation,
            invitation,
            serviceEmails
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user, refreshUser, config} = this.props;
        const allowedToEdit = isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id);
        let role;
        if (isInvitation) {
            role = invitation.intended_role === "admin" ? ROLES.COLL_ADMIN : ROLES.COLL_MEMBER;
        } else {
            role = adminOfCollaboration ? ROLES.COLL_ADMIN : ROLES.COLL_MEMBER;
        }
        return (<>
            {(adminOfCollaboration && showMemberView) && this.getUnitHeader(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}
            {(!showMemberView || !adminOfCollaboration) && this.getUnitHeaderForMemberNew(user, config, collaboration, allowedToEdit, showMemberView, collaborationJoinRequest, alreadyMember, adminOfCollaboration)}

            {!collaborationJoinRequest && <CollaborationWelcomeDialog name={collaboration.name}
                                                                      isOpen={firstTime}
                                                                      role={role}
                                                                      serviceEmails={serviceEmails}
                                                                      collaboration={collaboration}
                                                                      isAdmin={user.admin}
                                                                      isInvitation={isInvitation}
                                                                      close={this.doAcceptInvitation}/>}

            <JoinRequestDialog collaboration={collaboration}
                               isOpen={joinRequestDialogOpen}
                               refresh={callback => refreshUser(callback)}
                               history={this.props.history}
                               close={() => this.setState({joinRequestDialogOpen: false})}/>

            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelDialogAction}
                                confirm={confirmationDialogAction}
                                isWarning={isWarning}
                                question={confirmationQuestion}>
                {lastAdminWarning &&
                    <LastAdminWarning organisation={collaboration.organisation} currentUserDeleted={true}
                    />}
            </ConfirmationDialog>
            <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                {tabs}
            </Tabs>

        </>)
    }


}

export default CollaborationDetail;