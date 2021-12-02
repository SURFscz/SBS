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
    organisationByUserSchacHomeOrganisation,
    unsuspendCollaboration
} from "../api";
import "./CollaborationDetail.scss";
import I18n from "i18n-js";
import {collaborationRoles} from "../forms/constants";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import Tabs from "../components/Tabs";
import {ReactComponent as CoAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as EyeViewIcon} from "../icons/eye-svgrepo-com.svg";
import {ReactComponent as MemberIcon} from "../icons/groups.svg";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import {ReactComponent as JoinRequestsIcon} from "../icons/single-neutral-question.svg";
import {ReactComponent as AboutIcon} from "../icons/common-file-text-home.svg";
import {ReactComponent as AdminIcon} from "../icons/single-neutral-actions-key.svg";
import {ReactComponent as GlobeIcon} from "../icons/network-information.svg";
import {ReactComponent as PrivacyIcon} from "../icons/overview.svg";
import {ReactComponent as LeaveIcon} from "../icons/safety-exit-door-left.svg";
import {ReactComponent as PencilIcon} from "../icons/pencil-1.svg";
import CollaborationAdmins from "../components/redesign/CollaborationAdmins";
import SpinnerField from "../components/redesign/SpinnerField";
import UsedServices from "../components/redesign/UsedServices";
import Groups from "../components/redesign/Groups";
import AboutCollaboration from "../components/redesign/AboutCollaboration";
import {actionMenuUserRole, isUserAllowed, ROLES} from "../utils/UserRole";
import {getParameterByName} from "../utils/QueryParameters";
import WelcomeDialog from "../components/WelcomeDialog";
import JoinRequests from "../components/redesign/JoinRequests";
import {setFlash} from "../utils/Flash";
import ConfirmationDialog from "../components/ConfirmationDialog";
import ClipBoardCopy from "../components/redesign/ClipBoardCopy";
import Button from "../components/Button";
import JoinRequestDialog from "../components/JoinRequestDialog";
import Tooltip from "../components/redesign/Tooltip";
import LastAdminWarning from "../components/redesign/LastAdminWarning";
import moment from "moment";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import {isEmpty, removeDuplicates} from "../utils/Utils";

class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.roleOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`profile.${role}`)
        }));
        this.state = {
            invitation: null,
            collaboration: null,
            schacHomeOrganisation: null,
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
            joinRequestDialogOpen: false
        }
    }

    componentDidMount = callback => {
        const params = this.props.match.params;
        if (params.hash) {
            invitationByHash(params.hash).then(res => {
                this.setState({
                    invitation: res,
                    collaboration: res.collaboration,
                    loading: false,
                    firstTime: true,
                    adminOfCollaboration: false,
                    schacHomeOrganisation: "",
                    confirmationDialogOpen: false,
                    tab: "about",
                    isInvitation: true,
                    tabs: [this.getAboutTab(res.collaboration, true, false)]
                });
            }).catch(() => this.props.history.push("/404"));
        } else if (params.id) {
            const collaboration_id = parseInt(params.id, 10);
            collaborationAccessAllowed(collaboration_id)
                .then(json => {
                    const adminOfCollaboration = json.access === "full";
                    const promises = adminOfCollaboration ? [collaborationById(collaboration_id)] :
                        [collaborationLiteById(collaboration_id), organisationByUserSchacHomeOrganisation()];
                    Promise.all(promises)
                        .then(res => {
                            const {user} = this.props;
                            const tab = params.tab || (adminOfCollaboration ? this.state.tab : "about");
                            const collaboration = res[0];
                            const schacHomeOrganisation = adminOfCollaboration ? null : res[1];
                            const orgManager = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id, null);
                            const firstTime = getParameterByName("first", window.location.search) === "true";
                            this.showExpiryDateFlash(user, collaboration);
                            this.setState({
                                collaboration: collaboration,
                                adminOfCollaboration: adminOfCollaboration,
                                schacHomeOrganisation: schacHomeOrganisation,
                                loading: false,
                                confirmationDialogOpen: false,
                                firstTime: firstTime,
                                tabs: this.getTabs(collaboration, schacHomeOrganisation, adminOfCollaboration, false),
                                tab: tab,
                            }, () => {
                                callback && callback();
                                this.updateAppStore(collaboration, adminOfCollaboration, orgManager);
                                this.tabChanged(tab, collaboration.id);
                            });
                        }).catch(() => this.props.history.push("/404"));
                }).catch(() => this.props.history.push("/404"));
        } else {
            const {collaborationIdentifier, user} = this.props;
            if (!collaborationIdentifier) {
                this.props.history.push("/404");
            } else {
                collaborationByIdentifier(collaborationIdentifier)
                    .then(collaboration => {
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
                                tabs: this.getTabs(collaboration, null, false, false, true),
                                tab: "about",
                            }, () => {
                                AppStore.update(s => {
                                    s.breadcrumb.paths = [
                                        {path: "/", value: I18n.t("breadcrumb.home")},
                                        {value: I18n.t("breadcrumb.collaborationJoinRequest", {name: collaboration.name})}
                                    ]
                                    s.sideComponent = null;
                                });

                            })
                        }
                    }).catch(() => this.props.history.push("/404"));
            }
        }
    };

    isExpiryDateWarning = expiry_date => {
        const today = new Date().getTime();
        const expiryDate = expiry_date * 1000;
        const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
        return days < 60;
    }

    showExpiryDateFlash = (user, collaboration) => {
        let msg = "";
        const membership = collaboration.collaboration_memberships.find(m => m.user.id === user.id);

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
        if (!isEmpty(msg)) {
            setFlash(msg, "warning");
        }
    }

    componentWillUnmount() {
        AppStore.update(s => {
            s.sideComponent = null;
        });
    }

    updateAppStore = (collaboration, adminOfCollaboration, orgManager) => {
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
            s.sideComponent = adminOfCollaboration ? this.eyeView() : null;
        });
    }

    eyeView = () => {
        const {showMemberView, adminOfCollaboration} = this.state;
        return (
            <div className={`eye-view ${showMemberView ? "admin" : "member"}`} onClick={() => {
                health().then(() => {
                    const {showMemberView, collaboration, schacHomeOrganisation} = this.state;
                    const newTab = showMemberView ? "about" : "admins";
                    this.tabChanged(newTab, collaboration.id);
                    this.setState({
                            showMemberView: !showMemberView,
                            tabs: this.getTabs(collaboration, schacHomeOrganisation, adminOfCollaboration, showMemberView),
                            tab: newTab
                        },
                        () => {
                            AppStore.update(s => {
                                s.sideComponent = this.eyeView();
                            });

                        });
                });
            }}>
                {
                    <EyeViewIcon/>}<span>{I18n.t(`models.collaboration.${showMemberView ? "viewAsMember" : "viewAsAdmin"}`)}</span>
            </div>
        );
    }

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    getTabs = (collaboration, schacHomeOrganisation, adminOfCollaboration, showMemberView, isJoinRequest = false) => {
        //Actually this collaboration is not for members to view
        if ((!adminOfCollaboration || showMemberView) && !collaboration.disclose_member_information) {
            return [this.getAboutTab(collaboration, showMemberView, isJoinRequest)];
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
        return tabs.filter(tab => tab !== null);
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
        const count = collaboration.collaboration_memberships.length;
        return (<div key="members" name="members"
                     label={I18n.t("home.tabs.members", {count: count})}
                     icon={<MemberIcon/>}
                     readOnly={isJoinRequest}
                     notifier={(openInvitations > 0 && !showMemberView) ? openInvitations : null}>
            {!isJoinRequest && <CollaborationAdmins {...this.props} collaboration={collaboration} isAdminView={false}
                                                    showMemberView={showMemberView}
                                                    refresh={callback => this.componentDidMount(callback)}/>}
        </div>)
    }

    getGroupsTab = (collaboration, showMemberView, isJoinRequest = false) => {
        return (<div key="groups" name="groups"
                     label={I18n.t("home.tabs.groups", {count: collaboration.groups.length})}
                     readOnly={isJoinRequest}
                     icon={<GroupsIcon/>}>
            {!isJoinRequest && <Groups {...this.props} collaboration={collaboration} showMemberView={showMemberView}
                                       refresh={callback => this.componentDidMount(callback)}/>}
        </div>)
    }

    getJoinRequestsTab = (collaboration) => {
        const openJoinRequests = (collaboration.join_requests || []).filter(jr => jr.status === "open").length;
        if (collaboration.disable_join_requests) {
            return null;
        }
        return (<div key="joinrequests" name="joinrequests" label={I18n.t("home.tabs.joinRequests")}
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
        this.setState({tab: name}, () =>
            this.props.history.replace(`/collaborations/${collId}/${name}`));
    }


    getAdminHeader = (collaboration, collaborationJoinRequest) => {
        let admins;
        if (collaborationJoinRequest) {
            admins = collaboration.admins
                .map(m => ({name: m}));
        } else {
            admins = collaboration.collaboration_memberships
                .filter(m => m.role === "admin")
                .map(m => m.user);
        }
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

    createCollaborationRequest = () => {
        const {collaboration} = this.state;
        this.props.history.push(`/new-collaboration?organisationId=${collaboration.organisation_id}`);
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

    getUnitHeaderForMemberNew = (user, collaboration, allowedToEdit, showMemberView, collaborationJoinRequest, alreadyMember) => {
        const customAction = collaborationJoinRequest ? this.collaborationJoinRequestAction(collaboration, alreadyMember) : null;
        return <UnitHeader obj={collaboration}
                           dropDownTitle={actionMenuUserRole(user, collaboration.organisation, collaboration)}
                           actions={collaborationJoinRequest ? [] : this.getActions(user, collaboration, allowedToEdit, showMemberView)}
                           name={collaboration.name}
                           customAction={customAction}>
            <div className="org-attributes-container-grid">
                <section className="unit-info">
                    <ul>
                        <li>
                            <Tooltip children={<MemberIcon/>} id={"members-icon"} msg={I18n.t("tooltips.members")}/>
                            <span>{I18n.t("models.collaboration.memberHeader", {
                                nbrMember: collaborationJoinRequest ? collaboration.member_count : collaboration.collaboration_memberships.length,
                                nbrGroups: collaborationJoinRequest ? collaboration.group_count : collaboration.groups.length
                            })}</span></li>
                        <li>
                            <Tooltip children={<AdminIcon/>} id={"admins-icon"} msg={I18n.t("tooltips.admins")}/>
                            <span
                                dangerouslySetInnerHTML={{__html: this.getAdminHeader(collaboration, collaborationJoinRequest)}}/>
                        </li>
                        {collaboration.website_url &&
                        <li className="collaboration-url">
                            <Tooltip children={<GlobeIcon/>} id={"collaboration-icon"}
                                     msg={I18n.t("tooltips.collaborationUrl")}/>
                            <span>
                            <a href={collaboration.website_url} rel="noopener noreferrer"
                               target="_blank">{collaboration.website_url}</a>
                        </span>
                        </li>}
                        {collaboration.accepted_user_policy &&
                        <li className="collaboration-url">
                            <Tooltip children={<PrivacyIcon/>} id={"globe-icon"} msg={I18n.t("tooltips.aup")}/>
                            <span>
                            <a href={collaboration.accepted_user_policy} rel="noopener noreferrer"
                               target="_blank">{collaboration.accepted_user_policy}</a>
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

    getActions = (user, collaboration, allowedToEdit, showMemberView) => {
        const actions = [];
        if (allowedToEdit && showMemberView) {
            actions.push({
                svg: PencilIcon,
                name: I18n.t("home.edit"),
                perform: () => this.props.history.push("/edit-collaboration/" + collaboration.id)
            });
        }
        if (allowedToEdit && showMemberView && collaboration.status === "suspended") {
            actions.push({
                icon: "unlock",
                name: I18n.t("home.unsuspend"),
                perform: this.unsuspend(true)
            });
        }
        const isMember = collaboration.collaboration_memberships.some(m => m.user_id === user.id);
        if (isMember) {
            actions.push({
                svg: LeaveIcon,
                name: I18n.t("models.collaboration.leave"),
                perform: this.deleteMe
            });
        }
        const isAdminOfCollaboration = isUserAllowed(ROLES.COLL_ADMIN, user, collaboration.organisation_id, collaboration.id);
        if (!isMember && isAdminOfCollaboration && showMemberView) {
            actions.push({
                icon: "plus-circle",
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
                {/*<Tooltip children={<FontAwesomeIcon icon="info-circle"/>} id={`collaboration-${collaboration.id}`}*/}
                {/*         msg={I18n.t(`collaboration.status.${status}Tooltip`,*/}
                {/*             {expiryDate: expiryDate, lastActivityDate: lastActivityDate})}/>*/}

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
                    <span className="contains-tooltip">{I18n.t(`organisationMembership.status.name`)}
                        <FontAwesomeIcon data-tip data-for="membership-status" icon="info-circle"/>
                            <ReactTooltip id="membership-status" type="light" effect="solid" data-html={true}>
                                <span className="tooltip-wrapper-inner"
                                      dangerouslySetInnerHTML={{
                                          __html: I18n.t(`organisationMembership.status.${status}Tooltip`,
                                              {date: expiryDate})
                                      }}/>
                            </ReactTooltip>
                    </span>
                <span
                    className={className}>{I18n.t(`organisationMembership.status.${status}`, {date: expiryDate})}</span>
            </div>
        );
    }

    getUnitHeader = (user, collaboration, allowedToEdit, showMemberView) => {
        const joinRequestUrl = `${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`
        return (<UnitHeader obj={collaboration}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            history={(user.admin && allowedToEdit) && this.props.history}
                            auditLogPath={`collaborations/${collaboration.id}`}
                            breadcrumbName={I18n.t("breadcrumb.collaboration", {name: collaboration.name})}
                            name={collaboration.name}
                            dropDownTitle={actionMenuUserRole(user, collaboration.organisation, collaboration)}
                            actions={this.getActions(user, collaboration, allowedToEdit, showMemberView)}>
            <p>{collaboration.description}</p>
            <div className="org-attributes-container-grid">
                <div className="org-attributes">
                    <span className="contains-copy">
                        {collaboration.disable_join_requests && I18n.t("collaboration.noJoinRequests")}
                        {!collaboration.disable_join_requests && <span>
                            <a href={joinRequestUrl} target="_blank"
                               rel="noopener noreferrer">{I18n.t("collaboration.joinRequests")}</a>
                            <ClipBoardCopy
                                txt={`${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`}/></span>}
                    </span>
                </div>
                <div className="org-attributes">
                        <span className="contains-copy">
                        {!collaboration.accepted_user_policy && I18n.t("collaboration.noAup")}
                            {collaboration.accepted_user_policy && <span>
                            <a href={collaboration.accepted_user_policy} rel="noopener noreferrer"
                               target="_blank">{I18n.t("collaboration.aup")}</a>
                            <ClipBoardCopy txt={collaboration.accepted_user_policy}/></span>}
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
            isWarning, isInvitation, invitation
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user, refreshUser} = this.props;
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
                this.getUnitHeader(user, collaboration, allowedToEdit, showMemberView)}
                {(!showMemberView || !adminOfCollaboration) &&
                this.getUnitHeaderForMemberNew(user, collaboration, allowedToEdit, showMemberView, collaborationJoinRequest, alreadyMember)}

                <WelcomeDialog name={collaboration.name}
                               isOpen={firstTime}
                               role={role}
                               organisation={null}
                               collaboration={collaboration}
                               isAdmin={user.admin}
                               isInvitation={isInvitation}
                               close={this.doAcceptInvitation}/>

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