import React from "react";
import {searchOrganisations, serviceById} from "../api";
import "./ServiceDetail.scss";
import I18n from "i18n-js";
import Tabs from "../components/Tabs";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import Collaborations from "../components/redesign/Collaborations";
import ServiceOrganisations from "../components/redesign/ServiceOrganisations";
import SpinnerField from "../components/redesign/SpinnerField";
import {removeDuplicates} from "../utils/Utils";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            organisations: [],
            loading: true,
            tab: "organisations",
            tabs: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            Promise.all([serviceById(params.id), searchOrganisations("*")])
                .then(res => {
                    const {user} = this.props;
                    const service = res[0];
                    const organisations = res[1];
                    const tab = params.tab || this.state.tab;
                    const tabs = user.admin ? [
                        this.getOrganisationsTab(service, organisations),
                        this.getCollaborationsTab(service)
                    ] : [];
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {value: I18n.t("breadcrumb.services")},
                            {value: service.name}
                        ];
                    });
                    this.tabChanged(tab, service.id);
                    this.setState({
                        service: service,
                        organisations: organisations,
                        tab: tab,
                        tabs: tabs,
                        loading: false
                    });

                })
                .catch(e => {
                    this.props.history.push("/404")
                });
        } else {
            this.props.history.push("/404");
        }
    };

    refresh = callback => {
        const params = this.props.match.params;
        const {organisations} = this.state;
        this.setState({loading: true});
        serviceById(params.id).then(res => {
            const service = res;
            const tabs = [
                this.getOrganisationsTab(service, organisations),
                this.getCollaborationsTab(service)
            ];
            this.setState({
                service: service,
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
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.serviceCollaborations")}
                     icon={<ServicesIcon/>}>
            <Collaborations mayCreate={false}
                            showOrigin={true}
                            collaborations={colls}
                            modelName={"serviceCollaborations"}
                            {...this.props} />
        </div>)
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
                            name={service.name}
                            onEdit={() => this.props.history.push("/edit-service/" + service.id)}>
                    <p>{service.description}</p>
                    <div className="org-attributes-container">
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