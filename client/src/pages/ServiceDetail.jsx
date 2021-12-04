import React from "react";
import {
    allServiceConnectionRequests,
    searchOrganisations,
    serviceById,
    serviceInvitationAccept,
    serviceInvitationByHash
} from "../api";
import "./ServiceDetail.scss";
import I18n from "i18n-js";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as ServiceConnectionRequestsIcon} from "../icons/connections.svg";
import {ReactComponent as PencilIcon} from "../icons/pencil-1.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import {ReactComponent as UserAdminIcon} from "../icons/users.svg";

import Collaborations from "../components/redesign/Collaborations";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {removeDuplicates} from "../utils/Utils";
import {actionMenuUserRole, isUserServiceAdmin} from "../utils/UserRole";
import ServiceConnectionRequests from "../components/redesign/ServiceConnectionRequests";
import {ReactComponent as GroupsIcon} from "../icons/ticket-group.svg";
import ServiceGroups from "../components/redesign/ServiceGroups";
import ServiceAdmins from "../components/redesign/ServiceAdmins";
import {setFlash} from "../utils/Flash";
import ServiceWelcomeDialog from "../components/ServiceWelcomeDialog";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            invitation: null,
            isInvitation: false,
            organisations: [],
            serviceConnectionRequests: [],
            firstTime: false,
            loading: true,
            tab: "organisations",
            tabs: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            serviceInvitationByHash(params.hash).then(res => {
                this.setState({
                    invitation: res,
                    service: res.service,
                    loading: false,
                    firstTime: true,
                    isInvitation: true,
                    tabs: [this.getAdminsTab(res.service)]
                });
            }).catch(() => this.props.history.push("/404"));

        } else if (params.id) {
            const {user} = this.props;
            if (user.admin) {
                Promise.all([serviceById(params.id), searchOrganisations("*"),
                    allServiceConnectionRequests(params.id)])
                    .then(res => {
                        const service = res[0];
                        const organisations = res[1];
                        const serviceConnectionRequests = res[2];
                        const tabs = [
                            this.getOrganisationsTab(service, organisations),
                            this.getCollaborationsTab(service),
                            this.getAdminsTab(service),
                            this.getServiceGroupsTab(service)
                        ];
                        if (serviceConnectionRequests.length > 0) {
                            tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
                        }
                        this.afterFetch(params, service, organisations, serviceConnectionRequests, tabs);
                    }).catch(e => this.props.history.push("/404"));
            } else {
                serviceById(params.id)
                    .then(res => {
                        this.afterFetch(params, res, [], [], []);
                    }).catch(e => this.props.history.push("/404"));
            }
        } else {
            this.props.history.push("/404");
        }
    };

    onBoarding = () => {
        this.setState({firstTime: true});
    }

    afterFetch = (params, service, organisations, serviceConnectionRequests, tabs) => {
        const tab = params.tab || this.state.tab;
        AppStore.update(s => {
            s.breadcrumb.paths = [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/services/${service.id}`,
                    value: I18n.t("breadcrumb.service", {name: service.name})
                },
            ];
        });
        this.tabChanged(tab, service.id);
        this.setState({
            service: service,
            organisations: organisations,
            serviceConnectionRequests: serviceConnectionRequests,
            tab: tab,
            tabs: tabs,
            loading: false
        });
    }

    doAcceptInvitation = () => {
        const {invitation, isInvitation} = this.state;
        if (isInvitation) {
            serviceInvitationAccept(invitation).then(() => {
                this.props.refreshUser(() => {
                    const path = encodeURIComponent(`/services/${invitation.service_id}`);
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

    refresh = callback => {
        const params = this.props.match.params;
        const {organisations} = this.state;
        this.setState({loading: true});
        Promise.all([serviceById(params.id), allServiceConnectionRequests(params.id)])
            .then(res => {
                const service = res[0];
                const serviceConnectionRequests = res[1];
                const tabs = [
                    this.getOrganisationsTab(service, organisations),
                    this.getCollaborationsTab(service),
                    this.getAdminsTab(service),
                    this.getServiceGroupsTab(service)];
                if (serviceConnectionRequests.length > 0) {
                    tabs.push(this.getServiceConnectionRequestTab(service, serviceConnectionRequests));
                }
                this.setState({
                    service: service,
                    serviceConnectionRequests: serviceConnectionRequests,
                    tabs: tabs,
                    loading: false
                }, callback);
            }).catch(e => {
            this.props.history.push("/404")
        });
    };

    getOrganisationsTab = (service, organisations) => {
        return (<div key="organisations" name="organisations"
                     label={I18n.t("home.tabs.serviceOrganisations", {count: organisations.length})}
                     icon={<OrganisationsIcon/>}>
            <ServiceOrganisations {...this.props} refresh={this.refresh} service={service}
                                  organisations={organisations}/>
        </div>)
    }

    getAdminsTab = service => {
        const openInvitations = (service.service_invitations || []).length;
        return (<div key="admins" name="admins"
                     label={I18n.t("home.tabs.serviceAdmins", {count: service.service_memberships.length})}
                     icon={<UserAdminIcon/>}
                     notifier={openInvitations > 0 ? openInvitations : null}>
            <ServiceAdmins {...this.props} service={service}
                           refresh={this.refresh}/>
        </div>)
    }

    getServiceGroupsTab = (service) => {
        return (<div key="groups" name="groups"
                     label={I18n.t("home.tabs.groups", {count: service.service_groups.length})}
                     icon={<GroupsIcon/>}>
            {<ServiceGroups {...this.props} service={service}
                            refresh={this.refresh}/>}
        </div>)
    }

    getCollaborationsTab = service => {
        const collaborations = service.collaborations;
        collaborations.forEach(coll => coll.fromCollaboration = true);
        const collFromOrganisations = service.service_organisation_collaborations;
        collFromOrganisations.forEach(coll => coll.fromCollaboration = false);
        const colls = removeDuplicates(collaborations.concat(collFromOrganisations), "id");
        return (
            <div key="collaborations" name="collaborations"
                 label={I18n.t("home.tabs.serviceCollaborations", {count: colls.length})}
                 icon={<CollaborationsIcon/>}>
                <Collaborations mayCreate={false}
                                showOrigin={true}
                                collaborations={colls}
                                modelName={"serviceCollaborations"}
                                {...this.props} />
            </div>);
    }

    getServiceConnectionRequestTab = (service, serviceConnectionRequests) => {
        const nbr = (serviceConnectionRequests || []).length;
        return (
            <div key="serviceConnectionRequests" name="serviceConnectionRequests"
                 label={I18n.t("home.tabs.serviceConnectionRequests", {count: serviceConnectionRequests.length})}
                 icon={<ServiceConnectionRequestsIcon/>}
                 notifier={nbr > 0 ? nbr : null}>
                <ServiceConnectionRequests
                    service={service}
                    refresh={this.refresh}
                    serviceConnectionRequests={serviceConnectionRequests}
                    modelName={"serviceConnectionRequests"}
                    {...this.props} />
            </div>);

    }

    tabChanged = (name, id) => {
        const serviceId = id || this.state.service.id;
        this.setState({tab: name}, () =>
            this.props.history.replace(`/services/${serviceId}/${name}`));
    }

    compliancy = service => {
        const compliancies = [];
        if (service.sirtfi_compliant) {
            compliancies.push("Sirtfi")
        }
        if (service.code_of_conduct_compliant) {
            compliancies.push("CoCo")
        }
        if (service.research_scholarship_compliant) {
            compliancies.push("R&S")
        }
        if (compliancies.length === 0) {
            return null;
        }
        let compliant = compliancies.join(` ${I18n.t("service.compliancySeparator")} `);
        if (compliancies.length > 2) {
            const upToLast = compliancies.slice(0, compliancies.length - 1).join(", ");
            compliant = `${upToLast} ${I18n.t("service.compliancySeparator")} ${compliancies[compliancies.length - 1]}`
        }
        return I18n.t("service.compliancyLong", {compliant: compliant});
    }

    getActions = (user, service) => {
        const actions = [];
        if (user.admin || isUserServiceAdmin(user, service)) {
            actions.push({
                svg: PencilIcon,
                name: I18n.t("home.edit"),
                perform: () => this.props.history.push("/edit-service/" + service.id)
            });
        }
        return actions;
    }


    render() {
        const {tabs, service, loading, tab, firstTime} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        return (
            <div className="mod-service-container">
                <ServiceWelcomeDialog name={service.name}
                                      isOpen={firstTime}
                                      close={this.doAcceptInvitation}/>

                <UnitHeader obj={service}
                            mayEdit={user.admin || isUserServiceAdmin(user, service)}
                            history={user.admin && this.props.history}
                            auditLogPath={`services/${service.id}`}
                            breadcrumbName={I18n.t("breadcrumb.service", {name: service.name})}
                            name={service.name}
                            firstTime={user.admin ? this.onBoarding : undefined}
                            dropDownTitle={actionMenuUserRole(user)}
                            actions={this.getActions(user, service)}>
                    <p>{service.description}</p>
                    <div className="org-attributes-container-grid">
                        <div className="org-attributes">
                            <span>{I18n.t("service.uri")}</span>
                            <span>{service.uri ?
                                <a href={service.uri} target="_blank" rel="noopener noreferrer">{service.uri}</a> :
                                I18n.t("service.none")}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.contact_email")}</span>
                            <span>{service.contact_email ?
                                <a href={`mailto:${service.contact_email}`}>{service.contact_email}</a> : I18n.t("service.none")}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.privacy_policy")}</span>
                            {service.privacy_policy && <span>
                                <a href={service.privacy_policy} target="_blank" rel="noopener noreferrer">
                                    {service.privacy_policy}</a></span>}
                            {!service.privacy_policy && <span>{I18n.t("service.none")}</span>}
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.accepted_user_policy")}</span>
                            {service.accepted_user_policy && <span>
                                <a href={service.accepted_user_policy} target="_blank" rel="noopener noreferrer">
                                    {service.accepted_user_policy}</a></span>}
                            {!service.accepted_user_policy && <span>{I18n.t("service.none")}</span>}
                        </div>
                        <div className="org-attributes">
                            <span className={"orphan"}>{this.compliancy(service)}</span>
                        </div>
                    </div>
                </UnitHeader>
                <div className="mod-service-container">
                    <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                        {tabs}
                    </Tabs>
                </div>
            </div>);
    };
}

export default ServiceDetail;