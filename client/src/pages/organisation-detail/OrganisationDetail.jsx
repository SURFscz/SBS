import React from "react";
import {
    deleteOrganisationMembership,
    organisationById,
    organisationInvitationAccept,
    organisationInvitationByHash
} from "../../api";
import "./OrganisationDetail.scss";
import I18n from "../../locale/I18n";
import {isEmpty, stopEvent} from "../../utils/Utils";
import Tabs from "../../components/tabs/Tabs";
import UnitHeader from "../../components/redesign/unit-header/UnitHeader";
import OrganisationAdmins from "../../components/redesign/organisation-admins/OrganisationAdmins";
import {AppStore} from "../../stores/AppStore";
import Collaborations from "../../components/redesign/collaborations/Collaborations";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import ApiKeys from "../../components/redesign/api-keys/ApiKeys";
import CollaborationRequests from "../../components/redesign/collaboration-requests/CollaborationRequests";
import OrganisationWelcomeDialog from "../../components/organisation-welcome-dialog/OrganisationWelcomeDialog";
import {actionMenuUserRole, isUserAllowed, ROLES} from "../../utils/UserRole";
import {getParameterByName} from "../../utils/QueryParameters";
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import {socket, SUBSCRIPTION_ID_COOKIE_NAME} from "../../utils/SocketIO";
import Users from "../../components/redesign/users/Users";
import {ButtonType} from "@surfnet/sds";
import {isInvitationExpired} from "../../utils/Date";
import ServiceConnectionRequests from "../../components/redesign/service-connection-requests/ServiceConnectionRequests";
import OrganisationOverview from "../organisation-overview/OrganisationOverview";

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invitation: null,
            organisation: {},
            loading: true,
            tab: "collaborations",
            tabs: [],
            firstTime: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            socketSubscribed: false
        };
    }

    componentWillUnmount = () => {
        AppStore.update(s => {
            s.objectRole = null;
            s.actions = [];
        });
        const params = this.props.match.params;
        if (params.id) {
            const organisation_id = parseInt(params.id, 10);
            [`organisation_${organisation_id}`, "service"].forEach(topic => {
                socket.then(s => s.off(topic));
            });
        }
    }

    componentDidMount = callBack => {
        const params = this.props.match.params;
        if (params.hash) {
            organisationInvitationByHash(params.hash).then(res => {
                const {config, user} = this.props;
                this.setState({
                    invitation: res,
                    organisation: res.organisation,
                    adminOfOrganisation: false,
                    managerOfOrganisation: true,
                    loading: false,
                    firstTime: true,
                    confirmationDialogOpen: false,
                    isInvitation: true,
                    tabs: this.getTabs(res.organisation, config, true, user)
                });
            }).catch(() => {
                this.props.history.push("/404")
            });
        } else if (params.id) {
            const organisation_id = parseInt(params.id, 10);
            organisationById(organisation_id)
                .then(json => {
                    const {user, config} = this.props;
                    const member = (user.organisation_memberships || [])
                        .find(membership => membership.organisation_id === json.id);
                    if (isEmpty(member) && !user.admin) {
                        this.props.history.push("/");
                        return;
                    }
                    const {socketSubscribed} = this.state;
                    if (!socketSubscribed) {
                        [`organisation_${organisation_id}`, "service"].forEach(topic => {
                            socket.then(s => s.on(topic, data => {
                                const subscriptionIdSessionStorage = sessionStorage.getItem(SUBSCRIPTION_ID_COOKIE_NAME);
                                if (subscriptionIdSessionStorage !== data.subscription_id) {
                                    this.props.refreshUser(() => this.componentDidMount());
                                }
                            }));
                        });
                        this.setState({socketSubscribed: true})
                    }
                    const adminOfOrganisation = json.organisation_memberships
                        .some(member => member.role === "admin" && member.user_id === user.id) || user.admin;
                    const managerOfOrganisation = json.organisation_memberships
                        .some(member => member.role === "manager" && member.user_id === user.id);

                    const tab = params.tab || this.state.tab;
                    const tabs = this.getTabs(json, config, false, user);
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {value: I18n.t("breadcrumb.organisation", {name: json.name})}
                        ];
                        s.objectRole = actionMenuUserRole(user, json, null, null, true)
                    });
                    const firstTime = getParameterByName("first", window.location.search) === "true";
                    this.tabChanged(tab, json.id);
                    this.setState({
                        organisation: json,
                        adminOfOrganisation: adminOfOrganisation,
                        managerOfOrganisation: managerOfOrganisation,
                        tab: tab,
                        tabs: tabs,
                        firstTime: firstTime,
                        loading: false
                    }, callBack);

                }).catch(() => {
                this.props.history.push("/")
            });
        } else {
            this.props.history.push("/404");
        }
    };

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    getTabs = (organisation, config, isInvite, user) => {
        const isAdmin = isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id);
        const tabs = isInvite ? [
            this.getCollaborationsTab(organisation),
        ] : [
            this.getCollaborationsTab(organisation),
            this.getCollaborationRequestsTab(organisation),
            this.getOrganisationAdminsTab(organisation, user),
            this.getServiceConnectionRequestsTab(organisation),
            config.api_keys_enabled ? this.getAPIKeysTab(organisation, user) : null,
            this.getUsersTab(organisation),
            isAdmin ? this.getOrganisationOverviewTab(organisation) : null
        ];
        return tabs.filter(tab => tab !== null);
    }

    getUsersTab = organisation => {
        return (<div key="users" name="users"
                     label={I18n.t("home.tabs.orgUsers")}>
            <Users {...this.props}
                   organisation={organisation}
                   adminSearch={false}/>
        </div>)
    }

    getOrganisationAdminsTab = (organisation, user) => {
        const expiredInvitations = (organisation.organisation_invitations || []).some(inv => isInvitationExpired(inv));
        const isOrgAdmin = isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id);
        return (<div key="admins" name="admins"
                     label={I18n.t("home.tabs.orgAdmins", {count: organisation.organisation_memberships.length})}
                     notifier={expiredInvitations && isOrgAdmin}>
            <OrganisationAdmins {...this.props} organisation={organisation}
                                refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getAPIKeysTab = (organisation, user) => {
        return (<div key="keys" name="keys"
                     label={I18n.t("home.tabs.apikeys", {count: (organisation.api_keys || []).length})}>
            <ApiKeys {...this.props} organisation={organisation} user={user}
                     refresh={callback => this.componentDidMount(callback)}/>
        </div>);
    }

    getOrganisationOverviewTab = organisation => {
        return (
            <div key="overview" name="overview"
                 label={I18n.t("home.tabs.orgOverview")}>
                <OrganisationOverview {...this.props}
                                      refresh={callback => this.componentDidMount(callback)}
                                      organisation={organisation}/>
            </div>
        );

    }

    getCollaborationsTab = organisation => {
        return (<div key="collaborations" name="collaborations"
                     label={I18n.t("home.tabs.orgCollaborations", {count: (organisation.collaborations || []).length})}>
            <Collaborations {...this.props}
                            collaborations={organisation.collaborations}
                            organisation={organisation}/>
        </div>)
    }

    getCollaborationRequestsTab = organisation => {
        const crl = (organisation.collaboration_requests || []).filter(cr => cr.status === "open").length;
        const tabLabel = I18n.t("home.tabs.collaborationRequests", {count: (organisation.collaboration_requests || []).length});
        return (<div key="collaboration_requests" name="collaboration_requests"
                     label={tabLabel}
                     notifier={crl > 0 ? crl : null}>
            <CollaborationRequests {...this.props} organisation={organisation}/>
        </div>)

    }

    getServiceConnectionRequestsTab = organisation => {
        const serviceConnectionRequests = organisation.collaborations
            .map(coll => {
                coll.service_connection_requests.forEach(scr => scr.collaboration = coll)
                return coll.service_connection_requests
            })
            .flat()
            .filter(scr => scr.pending_organisation_approval);

        if (serviceConnectionRequests.length === 0) {
            return null;
        }
        const nbr = serviceConnectionRequests.filter(scr => scr.status === "open").length;
        return (
            <div key="serviceConnectionRequests"
                 name="serviceConnectionRequests"
                 label={I18n.t("home.tabs.serviceConnectionRequests")}
                 notifier={nbr > 0 ? nbr : null}>
                <ServiceConnectionRequests
                    refresh={callback => this.componentDidMount(callback)}
                    serviceConnectionRequests={serviceConnectionRequests}
                    modelName={"serviceConnectionRequests"}
                    {...this.props} />
            </div>);
    }

    tabChanged = (name, id) => {
        const orgId = id || this.state.organisation.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/organisations/${orgId}/${name}`));
    }

    doAcceptInvitation = () => {
        const {invitation, isInvitation} = this.state;
        if (isInvitation) {
            organisationInvitationAccept(invitation).then(() => {
                this.props.refreshUser(() => {
                    const path = encodeURIComponent(`/organisations/${invitation.organisation_id}`);
                    this.props.history.push(`/refresh-route/${path}`);
                });
            }).catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(res => {
                        if (res.message && res.message.indexOf("already a member") > -1) {
                            this.setState({errorOccurred: true, firstTime: false}, () =>
                                setFlash(I18n.t("organisationInvitation.flash.alreadyMember"), "error"));
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

    doDeleteMe = () => {
        this.setState({confirmationDialogOpen: false, loading: true});
        const {user} = this.props;
        const {organisation} = this.state;
        deleteOrganisationMembership(organisation.id, user.id)
            .then(() => {
                this.props.refreshUser(() => {
                    this.setState({confirmationDialogOpen: false, loading: false});
                    setFlash(I18n.t("organisationDetail.flash.memberDeleted", {name: user.name}));
                    if (user.admin) {
                        this.componentDidMount();
                    } else {
                        this.props.history.push("/home");
                    }
                });
            });
    };

    deleteMe = e => {
        stopEvent(e);
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteYourselfMemberConfirmation"),
            confirmationDialogAction: this.doDeleteMe
        });
    };

    getActions = (user, organisation, adminOfOrganisation) => {
        const actions = [];
        const isMember = organisation.organisation_memberships.find(m => m.user.id === user.id);
        const lastAdmin = adminOfOrganisation && organisation.organisation_memberships.filter(m => m.role === "admin").length < 2;
        if (isMember && (!lastAdmin || isMember.role !== "admin")) {
            actions.push({
                buttonType: ButtonType.DestructiveSecondary,
                name: I18n.t("models.organisations.leave"),
                perform: this.deleteMe
            });
        }
        if (!user.admin) {
            const queryParam = `name=${encodeURIComponent(organisation.name)}&back=${encodeURIComponent(window.location.pathname)}`;
            actions.push({
                buttonType: ButtonType.Secondary,
                name: I18n.t("home.history"),
                perform: () => this.props.history.push(`/audit-logs/organisations/${organisation.id}?${queryParam}`)
            });
        }
        return actions;
    }

    render() {
        const {
            tabs, organisation, loading, tab, firstTime, adminOfOrganisation,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
            isInvitation, invitation
        } = this.state;
        const {user} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        let role;
        if (isInvitation) {
            role = invitation.intended_role === "admin" ? ROLES.ORG_ADMIN : ROLES.ORG_MANAGER;
        } else {
            role = adminOfOrganisation ? ROLES.ORG_ADMIN : ROLES.ORG_MANAGER;
        }
        return (
            <div className="mod-organisation-container">
                <OrganisationWelcomeDialog name={organisation.name}
                                           isOpen={firstTime}
                                           role={role}
                                           organisation={organisation}
                                           collaboration={null}
                                           isAdmin={user.admin}
                                           isInvitation={isInvitation}
                                           close={this.doAcceptInvitation}/>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationQuestion}/>
                <UnitHeader obj={organisation}
                            mayEdit={true}
                            displayDescription={true}
                            history={user.admin ? this.props.history : null}
                            auditLogPath={`organisations/${organisation.id}`}
                            breadcrumbName={I18n.t("breadcrumb.organisation", {name: organisation.name})}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            name={organisation.name}
                            actions={this.getActions(user, organisation, adminOfOrganisation)}>
                    {organisation.accepted_user_policy &&
                        <a target="_blank" rel="noopener noreferrer" href={organisation.accepted_user_policy}>
                            {I18n.t("aup.title")}
                        </a>
                    }
                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    }
}

export default OrganisationDetail;
