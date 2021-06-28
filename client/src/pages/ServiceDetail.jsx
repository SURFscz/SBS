import React from "react";
import {allServiceConnectionRequests, searchOrganisations, serviceById} from "../api";
import "./ServiceDetail.scss";
import I18n from "i18n-js";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {ReactComponent as ServiceConnectionRequestsIcon} from "../icons/connections.svg";
import {ReactComponent as PencilIcon} from "../icons/pencil-1.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import Collaborations from "../components/redesign/Collaborations";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {removeDuplicates} from "../utils/Utils";
import {actionMenuUserRole} from "../utils/UserRole";
import ServiceConnectionRequests from "../components/redesign/ServiceConnectionRequests";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            organisations: [],
            serviceConnectionRequests: [],
            loading: true,
            tab: "organisations",
            tabs: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
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
                            this.getServiceConnectionRequest(service, serviceConnectionRequests)
                        ];
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
                    this.getServiceConnectionRequest(service, serviceConnectionRequests)];
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
        return (<div key="organisations" name="organisations" label={I18n.t("home.tabs.serviceOrganisations")}
                     icon={<OrganisationsIcon/>}>
            <ServiceOrganisations {...this.props} refresh={this.refresh} service={service}
                                  organisations={organisations}/>
        </div>)
    }

    getCollaborationsTab = service => {
        const collaborations = service.collaborations;
        collaborations.forEach(coll => coll.fromCollaboration = true);
        const collFromOrganisations = service.service_organisation_collaborations;
        collFromOrganisations.forEach(coll => coll.fromCollaboration = false);
        const colls = removeDuplicates(collaborations.concat(collFromOrganisations), "id");
        return (
            <div key="collaborations" name="collaborations" label={I18n.t("home.tabs.serviceCollaborations")}
                 icon={<CollaborationsIcon/>}>
                <Collaborations mayCreate={false}
                                showOrigin={true}
                                collaborations={colls}
                                modelName={"serviceCollaborations"}
                                {...this.props} />
            </div>);
    }

    getServiceConnectionRequest = (service, serviceConnectionRequests) => {
        const nbr = (serviceConnectionRequests || []).length;
        return (
            <div key="serviceConnectionRequests" name="serviceConnectionRequests"
                 label={I18n.t("home.tabs.serviceConnectionRequests")} icon={<ServiceConnectionRequestsIcon/>}
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
        return compliancies.length === 0 ? I18n.t("service.none") : compliancies.join(", ");
    }

    getActions = (user, service) => {
        const actions = [];
        if (user.admin) {
            actions.push({
                svg: PencilIcon,
                name: I18n.t("home.edit"),
                perform: () => this.props.history.push("/edit-service/" + service.id)
            });
        }
        return actions;
    }


    render() {
        const {tabs, service, loading, tab} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {user} = this.props;
        return (
            <>
                <UnitHeader obj={service}
                            mayEdit={user.admin}
                            history={user.admin && this.props.history}
                            auditLogPath={`services/${service.id}`}
                            breadcrumbName={I18n.t("breadcrumb.service", {name: service.name})}
                            name={service.name}
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
                            <span>{I18n.t("service.compliancyShort")}</span>
                            <span>{this.compliancy(service)}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.contact_email")}</span>
                            <span>{service.contact_email ?
                                <a href={`mailto:${service.contact_email}`}>{I18n.t("service.contact")}</a> : I18n.t("service.none")}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("service.whiteListed")}</span>
                            <span>{service.white_listed ? I18n.t("forms.yes") : I18n.t("forms.no")}</span>
                        </div>
                        {service.accepted_user_policy &&
                        <div className="org-attributes">
                            <span>{I18n.t("service.accepted_user_policy")}</span>
                            <span><a href={service.accepted_user_policy}
                                     target="_blank" rel="noopener noreferrer">service.accepted_user_policy</a></span>
                        </div>}
                    </div>
                </UnitHeader>
                <div className="mod-service-container">
                    <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                        {tabs}
                    </Tabs>
                </div>
            </>);
    };
}

export default ServiceDetail;