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

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            loaded: false,
            tab: "organisations",
            tabs: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id) {
            Promise.all([serviceById(params.id), searchOrganisations("*")])
                .then(res => {
                    const service = res[0];
                    const organisations = res[1];
                    const tab = params.tab || this.state.tab;
                    const tabs = [
                        this.getOrganisationsTab(service, organisations),
                        this.getCollaborationsTab(service)
                    ];
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {path: "/", value: service.name}
                        ];
                    });
                    this.tabChanged(tab, service.id);
                    this.setState({
                        service: service,
                        tab: tab,
                        tabs: tabs,
                        loaded: true
                    });

                })
                .catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    getOrganisationsTab = (service, organisations) => {
        return (<div key="organisations" name="organisations" label={I18n.t("home.tabs.serviceOrganisations")}
                     icon={<OrganisationsIcon/>}>
            <ServiceOrganisations {...this.props} service={service} organisations={organisations}/>
        </div>)
    }

    getCollaborationsTab = service => {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.serviceCollaborations")}
                     icon={<ServicesIcon/>}>
            <Collaborations {...this.props} collaborations={service.collaborations}
                            includeCounts={false}
                            modelName={"serviceCollaborations"}
                            includeOrganisationName={true}/>
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
        const {tabs, service, loaded, tab} = this.state;
        if (!loaded) {
            return <SpinnerField/>;
        }
        return (
            <div className="mod-service-container">
                <UnitHeader obj={service} mayEdit={true} history={this.props.history}
                            auditLogPath={`services/${service.id}`}
                            name={service.name}
                            onEdit={() => this.props.history.push("/edit-service/" + service.id)}>
                    <p>{service.description}</p>
                    <div className="org-attributes-container">
                        <div className="org-attributes">
                            <span>{I18n.t("service.uri")}</span>
                            <span>{service.uri ? service.uri : I18n.t("service.none")}</span>
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
                <Tabs activeTab={tab} tabChanged={this.tabChanged}>
                    {tabs}
                </Tabs>
            </div>);
    };
}

export default ServiceDetail;