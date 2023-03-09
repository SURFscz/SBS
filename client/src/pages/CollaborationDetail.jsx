import React from "react";
import {
    collaborationAccessAllowed,
    collaborationById,
    collaborationByIdentifier,
    collaborationLiteById,
    createCollaborationMembershipRole,
    deleteCollaborationMembership,
    health,
    invitationAccept,
    invitationByHash,
    organisationsByUserSchacHomeOrganisation,
    unsuspendCollaboration,
    userTokensOfUser
} from "../api";
import "./CollaborationDetail.scss";
import I18n from "i18n-js";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as MemberIcon} from "../icons/groups.svg";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import {ReactComponent as UserTokensIcon} from "../icons/connections.svg";
import {ReactComponent as JoinRequestsIcon} from "../icons/single-neutral-question.svg";
import {ReactComponent as AboutIcon} from "../icons/common-file-text-home.svg";
import {ReactComponent as AdminIcon} from "../icons/single-neutral-actions-key.svg";
import {ReactComponent as GlobeIcon} from "../icons/network-information.svg";
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
import ClipBoardCopy from "../components/redesign/ClipBoardCopy";
import Button from "../components/Button";
import JoinRequestDialog from "../components/JoinRequestDialog";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import moment from "moment";
import {ButtonType, Tooltip} from "@surfnet/sds";
import {ErrorOrigins, getSchacHomeOrg, isEmpty, removeDuplicates} from "../utils/Utils";
import UserTokens from "../components/redesign/UserTokens";
import {socket, subscriptionIdCookieName} from "../utils/SocketIO";
import DOMPurify from "dompurify";

class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roleOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`profile.${role}`)
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
            tab: "admins",
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
        AppStore.update(s => {
            s.objectRole = null;
            s.actions = [];
        });
        const params = this.props.match.params;
        if (params.id) {
            const collaboration_id = parseInt(params.id, 10);
            socket.then(s => s.off(`collaboration_${collaboration_id}`));
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
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const adminOfCollaboration = json.access === "full";
                    const promises = adminOfCollaboration ? [collaborationById(collaboration_id), userTokensOfUser()] :
                        [collaborationLiteById(collaboration_id), organisationsByUserSchacHomeOrganisation(), userTokensOfUser()];
                    const {socketSubscribed} = this.state;
                    if (!socketSubscribed) {
                        socket.then(s => s.on(`collaboration_${collaboration_id}`, data => {
                            const subscriptionIdSessionStorage = sessionStorage.getItem(subscriptionIdCookieName);
                            if (subscriptionIdSessionStorage !== data.subscription_id) {
                                this.props.refreshUser(() => this.componentDidMount());
                            }
                        }));
                        this.setState({socketSubscribed: true})
                    }
                    Promise.all(promises)
                        .then(res => {
                            const {user, config} = this.props;
                            const tab = params.tab || (adminOfCollaboration ? this.state.tab : "about");
                            const collaboration = res[0];
                            const userTokens = res[res.length - 1];
                            const schacHomeOrganisation = adminOfCollaboration ? null : getSchacHomeOrg(user, res[1]);
                            const orgManager = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id, null);
                            const firstTime = getParameterByName("first", window.location.search) === "true";
                            this.showExpiryDateFlash(user, collaboration, config);
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
                                    s.breadcrumb.paths = [
                                        {path: "/", value: I18n.t("breadcrumb.home")},
                                        {value: I18n.t("breadcrumb.collaborationJoinRequest", {name: collaboration.name})}
                                    ]
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
    ;

    isExpiryDateWarning = expiry_date => {
        const today = new Date().getTime();
        const expiryDate = expiry_date * 1000;
        const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
        return days < 60;
    }

    showExpiryDateFlash = (user, collaboration, config) => {
        let msg = "";
        const membership = collaboration.collaboration_memberships.find(m => m.user_id === user.id);

        if (membership && membership.expiry_date) {
            const formattedMembershipExpiryDate = moment(membership.expiry_date * 1000).format("LL");
            if (membership.status === "expired") {
                msg += I18n.t("organisationMembership.status.expiredTooltip", {date: formattedMembershipExpiryDate});
            } else if (this.isExpiryDateWarning(membership.expiry_date)) {
                msg += I18n.t("organisationMembership.status.activeWithExpiryDateTooltip", {date: formattedMembershipExpiryDate});
            }
        }
        if (collaboration && collaboration.expiry_date) {
            const formattedCollaborationExpiryDate = moment(collaboration.expiry_date * 1000).format("LL");
            if (collaboration.status === "expired") {
                msg += I18n.t("collaboration.status.expiredTooltip", {expiryDate: formattedCollaborationExpiryDate});
            } else if (this.isExpiryDateWarning(collaboration.expiry_date)) {
                msg += I18n.t("collaboration.status.activeWithExpiryDateTooltip", {expiryDate: formattedCollaborationExpiryDate});
            }
        }
        if (collaboration && collaboration.status === "suspended") {
            msg += I18n.t("collaboration.status.suspendedTooltip", {
                lastActivityDate: moment(collaboration.last_activity_date * 1000).format("LL")
            });
            if (isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id)) {
                msg += I18n.t("collaboration.status.revertSuspension")
            }
        }
        if (collaboration && collaboration.last_activity_date) {
            const almostSuspended = this.isCollaborationAlmostSuspended(user, collaboration, config)
            if (almostSuspended) {
                msg += I18n.t("collaboration.status.almostSuspended", {
                    days: almostSuspended
                });
                if (isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id)) {
                    msg += I18n.t("collaboration.status.revertAlmostSuspended")
                }
            }
        }
        if (!isEmpty(msg)) {
            setFlash(msg, "warning");
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
            s.breadcrumb.paths = orgManager ? [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/organisations/${collaboration.organisation_id}`,
                    value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name})
                },
                {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
            ] : [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
            ];
            s.actions = this.getHeaderActions(user, config, collaboration);
            s.objectRole = actionMenuUserRole(user, collaboration.organisation, collaboration, null, true);
        });
    }

    toggleAdminMemberView = () => {
        const {adminOfCollaboration} = this.state;
        health().then(() => {
            const {showMemberView, collaboration, schacHomeOrganisation, userTokens} = this.state;
            const newTab = showMemberView ? "about" : "admins";
            this.tabChanged(newTab, collaboration.id);
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
        if (!isUserAllowed(ROLES.COLL_MEMBER, user, collaboration.organisation_id, collaboration.id)) {
            return [];
        }
        const services = isJoinRequest ? [] : removeDuplicates(collaboration.services.concat(collaboration.organisation.services)
            .filter(s => s.token_enabled), "id");
        //Actually this collaboration is not for members to view
        if ((!adminOfCollaboration || showMemberView) && !collaboration.disclose_member_information) {
            const minimalTabs = [
                this.getAboutTab(collaboration, showMemberView, isJoinRequest),
            ];
            this.addUserTokenTab(userTokens, services, isJoinRequest, minimalTabs, collaboration);
            return minimalTabs;
        }
        const tabs = (adminOfCollaboration && !showMemberView) ?
            [
                this.getCollaborationAdminsTab(collaboration),
                this.getMembersTab(collaboration, showMemberView),
                this.getGroupsTab(collaboration, showMemberView),
                this.getServicesTab(collaboration),
                this.getJoinRequestsTab(collaboration),
            ] : [
                this.getAboutTab(collaboration, showMemberView, isJoinRequest),
                this.getMembersTab(collaboration, showMemberView, isJoinRequest),
                this.getGroupsTab(collaboration, showMemberView, isJoinRequest),
            ];
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
        const openInvitations = (collaboration.invitations || []).filter(inv => inv.intended_role === "admin").length;
        const count = collaboration.collaboration_memberships.filter(m => m.role === "admin").length;
        return (<div key="admins"
                     name="admins"
                     label={I18n.t("home.tabs.coAdmins", {count: count})}
                     icon={<CoAdminIcon/>}
                     notifier={openInvitations > 0 ? openInvitations : null}>
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={true}
                                 refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getMembersTab = (collaboration, showMemberView, isJoinRequest = false) => {
        const openInvitations = (collaboration.invitations || []).length;
        const count = (collaboration.collaboration_memberships || []).length;
        return (<div key="members" name="members"
                     label={I18n.t("home.tabs.members", {count: count})}
                     icon={<MemberIcon/>}
                     readOnly={isJoinRequest}
                     notifier={(openInvitations > 0 && !showMemberView) ? openInvitations : null}>
            {!isJoinRequest &&
            <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={false}
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

    getServicesTab = collaboration => {
        const usedServices = removeDuplicates(collaboration.services.concat(collaboration.organisation.services), "id");
        const openServiceConnectionRequests = (collaboration.service_connection_requests || [])
            .filter(r => r.is_member_request).length;
        return (<div key="services" name="services"
                     label={I18n.t("home.tabs.coServices", {count: usedServices.length})}
                     icon={<ServicesIcon/>}
                     notifier={openServiceConnectionRequests > 0 ? openServiceConnectionRequests : null}>
            <UsedServices collaboration={collaboration}
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

    deleteMe = () => {
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
        this.setState({tab: name}, () =>
            this.props.history.replace(`/collaborations/${collId}/${name}`));
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
            name: admins[0].name,
            mails: mails,
            bcc: bcc,
            nbr: admins.length - 1
        });
    }

    collaborationJoinRequestAction = (collaboration, alreadyMember) => {
        return (
            <div className="join-request-action">
                <Button txt={I18n.t("registration.joinRequest", {name: collaboration.name})}
                        disabled={alreadyMember}
                        onClick={() => this.setState({joinRequestDialogOpen: true})}/>
            </div>
        );
    }

    getUnitHeaderForMemberNew = (user, config, collaboration, allowedToEdit, showMemberView, collaborationJoinRequest, alreadyMember, adminOfCollaboration) => {
        const customAction = collaborationJoinRequest ? this.collaborationJoinRequestAction(collaboration, alreadyMember) : null;
        return <UnitHeader obj={collaboration}
                           actions={collaborationJoinRequest ? [] : this.getActions(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}
                           name={collaboration.name}
                           customAction={customAction}>
            <div className="org-attributes-container-grid">
                <section className="unit-info">
                    <ul>
                        <li>
                            <Tooltip children={<MemberIcon/>} standalone={true} tip={I18n.t("tooltips.members")}/>
                            <span>{I18n.t("models.collaboration.memberHeader", {
                                nbrMember: collaboration.collaboration_memberships.length,
                                nbrGroups: collaboration.groups.length
                            })}</span></li>
                        {!collaborationJoinRequest && <li>
                            <Tooltip children={<AdminIcon/>} standalone={true} tip={I18n.t("tooltips.admins")}/>
                            <span
                                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(this.getAdminHeader(collaboration))}}/>
                        </li>}
                        {collaboration.website_url &&
                        <li className="collaboration-url">
                            <Tooltip standalone={true} children={<GlobeIcon/>} anchorId={"collaboration-icon"}
                                     tip={I18n.t("tooltips.collaborationUrl")}/>
                            <span>
                            <a href={collaboration.website_url} rel="noopener noreferrer"
                               target="_blank">{collaboration.website_url}</a>
                        </span>
                        </li>}
                    </ul>
                </section>
                <section className="collaboration-inactive">
                    {!collaborationJoinRequest && this.getCollaborationStatus(collaboration)}
                    {!collaborationJoinRequest && this.getMembershipStatus(collaboration, user)}
                </section>
            </div>
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
                buttonType: ButtonType.Primary,
                name: I18n.t("home.edit"),
                perform: () => {
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
        if (allowedToEdit && showMemberView && collaboration.status === "suspended") {
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t("home.unsuspend"),
                perform: this.unsuspend(true)
            });
        }
        const almostSuspended = this.isCollaborationAlmostSuspended(user, collaboration, config);
        if (almostSuspended && allowedToEdit && showMemberView) {
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t("home.resetLastActivity"),
                perform: this.resetLastActivityDate(true)
            });
        }
        const isMember = collaboration.collaboration_memberships.some(m => m.user_id === user.id);
        if (!isMember && user.admin && showMemberView) {
            actions.push({
                buttonType: ButtonType.Chevron,
                name: I18n.t("collaborationDetail.addMe"),
                perform: this.addMe
            })
        }
        return actions;
    }

    addMe = () => {
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
        // const lastActivityDate = moment(collaboration.last_activity_date * 1000).format("LL");
        const className = collaboration.status !== "active" ? "warning" : "";
        const status = (collaboration.status === "active" && collaboration.expiry_date) ? "activeWithExpiryDate" : collaboration.status;
        return (
            <div className="org-attributes">
                <span
                    className={`${className} contains-tooltip`}>{I18n.t(`collaboration.status.${status}`, {expiryDate: expiryDate})}</span>
            </div>
        );
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
                            this.setState({errorOccurred: true, firstTime: false}, () =>
                                setFlash(I18n.t("invitation.flash.alreadyMember", {"name": invitation.collaboration.name}), "error"));
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
        const expiryDate = membership.expiry_date ? moment(membership.expiry_date * 1000).format("LL") : I18n.t("service.none");
        const className = membership.status !== "active" ? "warning" : "";
        let status;
        if (membership.expiry_date && membership.status === "expired") {
            status = "expired";
        } else if (membership.expiry_date && membership.status === "active") {
            status = "activeWithExpiryDate";
        } else {
            status = "active";
        }
        return (
            <div className="org-attributes">
                <span>{I18n.t(`organisationMembership.status.name`)}</span>
                <span className={className}>
                    {I18n.t(`organisationMembership.status.${status}`, {date: expiryDate})}
                    <Tooltip tip={I18n.t(`organisationMembership.status.${status}Tooltip`, {date: expiryDate})}/>
                </span>

            </div>
        );
    }

    getUnitHeader = (user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration) => {
        const joinRequestUrl = `${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`
        return (<UnitHeader obj={collaboration}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            history={(user.admin && allowedToEdit) && this.props.history}
                            auditLogPath={`collaborations/${collaboration.id}`}
                            breadcrumbName={I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
                            name={collaboration.name}
                            actions={this.getActions(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}>
            <p>{collaboration.description}</p>
            <div className="org-attributes-container-grid">
                <div className="org-attributes">
                    <span className="contains-copy">
                        {collaboration.disable_join_requests && I18n.t("collaboration.noJoinRequests")}
                        {!collaboration.disable_join_requests && <span>
                            <a href={joinRequestUrl} target="_blank"
                               rel="noopener noreferrer">{I18n.t("collaboration.joinRequests")}</a>
                            <ClipBoardCopy transparentBackground={true}
                                           txt={`${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`}/></span>}
                    </span>
                </div>
                {this.getCollaborationStatus(collaboration)}
                <div className="org-attributes">
                    {(collaboration.disclose_email_information || collaboration.disclose_member_information) &&
                    <span>{I18n.t("collaboration.discloseMembers")}</span>}
                    {(!collaboration.disclose_email_information && !collaboration.disclose_member_information) &&
                    <span>{I18n.t("collaboration.discloseNoMembers")}</span>}
                </div>
            </div>
        </UnitHeader>);
    }

    render() {
        const {
            collaboration, loading, tabs, tab, adminOfCollaboration, showMemberView, firstTime,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
            collaborationJoinRequest, joinRequestDialogOpen, alreadyMember, lastAdminWarning,
            isWarning, isInvitation, invitation, serviceEmails
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
        return (
            <>
                {(adminOfCollaboration && showMemberView) &&
                this.getUnitHeader(user, config, collaboration, allowedToEdit, showMemberView, adminOfCollaboration)}
                {(!showMemberView || !adminOfCollaboration) &&
                this.getUnitHeaderForMemberNew(user, config, collaboration, allowedToEdit, showMemberView,
                    collaborationJoinRequest, alreadyMember, adminOfCollaboration)}

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