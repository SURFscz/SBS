import React from "react";
import {deleteOrganisationMembership, organisationById} from "../api";
import "./OrganisationDetail.scss";
import I18n from "i18n-js";
import {isEmpty} from "../utils/Utils";
import Tabs from "../components/Tabs";
import {ReactComponent as PlatformAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as ApiKeysIcon} from "../icons/security.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as CollaborationRequestsIcon} from "../icons/faculty.svg";
import {ReactComponent as LeaveIcon} from "../icons/safety-exit-door-left.svg";
import {ReactComponent as PencilIcon} from "../icons/pencil-1.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import OrganisationAdmins from "../components/redesign/OrganisationAdmins";
import {AppStore} from "../stores/AppStore";
import Collaborations from "../components/redesign/Collaborations";
import SpinnerField from "../components/redesign/SpinnerField";
import ApiKeys from "../components/redesign/ApiKeys";
import OrganisationServices from "../components/redesign/OrganisationServices";
import CollaborationRequests from "../components/redesign/CollaborationRequests";
import WelcomeDialog from "../components/WelcomeDialog";
import {actionMenuUserRole, ROLES} from "../utils/UserRole";
import {getParameterByName} from "../utils/QueryParameters";
import {setFlash} from "../utils/Flash";
import ConfirmationDialog from "../components/ConfirmationDialog";

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: {},
            loading: true,
            tab: "collaborations",
            tabs: [],
            firstTime: false,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
        };
    }

    componentDidMount = callBack => {
        const params = this.props.match.params;
        if (params.id) {
            organisationById(params.id)
                .then(json => {
                    const {user, config} = this.props;
                    const member = (user.organisation_memberships || [])
                        .find(membership => membership.organisation_id === json.id);
                    if (isEmpty(member) && !user.admin) {
                        this.props.history.push("/404");
                        return;
                    }
                    const adminOfOrganisation = json.organisation_memberships
                        .some(member => member.role === "admin" && member.user_id === user.id) || user.admin;
                    const managerOfOrganisation = json.organisation_memberships
                        .some(member => member.role === "manager" && member.user_id === user.id);

                    const tab = params.tab || this.state.tab;
                    const tabs = this.getTabs(json, config, adminOfOrganisation);
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {value: I18n.t("breadcrumb.organisation", {name: json.name})}
                        ];
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

                })
                .catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    getTabs = (organisation, config) => {
        const tabs = [
            this.getCollaborationsTab(organisation),
            this.getCollaborationRequestsTab(organisation),
            this.getOrganisationAdminsTab(organisation),
            this.getServicesTab(organisation),
            config.api_keys_enabled ? this.getAPIKeysTab(organisation) : null
        ];
        return tabs.filter(tab => tab !== null);
    }

    getOrganisationAdminsTab = (organisation) => {
        const openInvitations = (organisation.organisation_invitations || []).length;
        return (<div key="admins" name="admins" label={I18n.t("home.tabs.orgAdmins")}
                     icon={<PlatformAdminIcon/>}
                     notifier={openInvitations > 0 ? openInvitations : null}>
            <OrganisationAdmins {...this.props} organisation={organisation}
                                refresh={callback => this.componentDidMount(callback)}/>
        </div>)
    }

    getServicesTab = organisation => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.orgServices")} icon={<ServicesIcon/>}>
            <OrganisationServices {...this.props} organisation={organisation}
                                  refresh={callback => this.componentDidMount(callback)}/>
        </div>);
    }

    getAPIKeysTab = organisation => {
        return (<div key="apikeys" name="apikeys" label={I18n.t("home.tabs.apikeys")} icon={<ApiKeysIcon/>}>
            <ApiKeys {...this.props} organisation={organisation}
                     refresh={callback => this.componentDidMount(callback)}/>
        </div>);
    }

    getCollaborationsTab = organisation => {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.orgCollaborations")}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props} collaborations={organisation.collaborations}
                            organisation={organisation} showExpiryDate={true} showLastActivityDate={true}/>
        </div>)
    }

    getCollaborationRequestsTab = organisation => {
        const crl = (organisation.collaboration_requests || []).filter(cr => cr.status === "open").length;
        return (<div key="collaboration_requests" name="collaboration_requests"
                     label={I18n.t("home.tabs.collaborationRequests")}
                     notifier={crl > 0 ? crl : null}
                     icon={<CollaborationRequestsIcon/>}>
            <CollaborationRequests {...this.props} organisation={organisation}/>
        </div>)

    }

    tabChanged = (name, id) => {
        const orgId = id || this.state.organisation.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/organisations/${orgId}/${name}`));
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

    deleteMe = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("organisationDetail.deleteYourselfMemberConfirmation"),
            confirmationDialogAction: this.doDeleteMe
        });
    };

    getActions = (user, organisation, adminOfOrganisation) => {
        const actions = [];
        if (adminOfOrganisation) {
            actions.push({
                svg: PencilIcon,
                name: I18n.t("home.edit"),
                perform: () => this.props.history.push("/edit-organisation/" + organisation.id)
            });
        }
        const isMember = organisation.organisation_memberships.find(m => m.user.id === user.id);
        const lastAdmin = adminOfOrganisation && organisation.organisation_memberships.filter(m => m.role === "admin").length < 2;
        if (isMember && (!lastAdmin || isMember.role !== "admin")) {
            actions.push({
                svg: LeaveIcon,
                name: I18n.t("models.organisations.leave"),
                perform: this.deleteMe
            });
        }
        return actions;
    }


    render() {
        const {
            tabs, organisation, loading, tab, firstTime, adminOfOrganisation,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion
        } = this.state;
        const {user} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        return (
            <div className="mod-organisation-container">
                {<WelcomeDialog name={organisation.name} isOpen={firstTime}
                                role={adminOfOrganisation ? ROLES.ORG_ADMIN : ROLES.ORG_MANAGER}
                                isOrganisation={true}
                                isAdmin={user.admin}
                                close={() => this.setState({firstTime: false})}/>}
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationQuestion}/>
                <UnitHeader obj={organisation}
                            mayEdit={adminOfOrganisation}
                            history={user.admin ? this.props.history : null}
                            auditLogPath={`organisations/${organisation.id}`}
                            breadcrumbName={I18n.t("breadcrumb.organisation", {name: organisation.name})}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            name={organisation.name}
                            dropDownTitle={actionMenuUserRole(user, organisation, null)}
                            actions={this.getActions(user, organisation, adminOfOrganisation)}>

                    <p>{organisation.description}</p>
                    <div className="org-attributes-container">
                        <div className="org-attributes">
                            <span>{I18n.t("organisation.schacHomeOrganisationShortName")}</span>
                            <span>{isEmpty(organisation.schac_home_organisations) ? I18n.t("service.none") :  organisation.schac_home_organisations.map(sho => sho.name).join(", ")}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("organisation.collaborationCreationAllowed")}</span>
                            <span>{I18n.t(`forms.${organisation.collaboration_creation_allowed ? "yes" : "no"}`)}</span>
                        </div>
                    </div>
                </UnitHeader>
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };
}

export default OrganisationDetail;