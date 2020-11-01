import React from "react";
import {organisationById, serviceById} from "../api";
import "./OrganisationDetail.scss";
import I18n from "i18n-js";
import {isEmpty} from "../utils/Utils";
import Tabs from "../components/Tabs";
import {ReactComponent as PlatformAdminIcon} from "../icons/users.svg";
import {ReactComponent as ServicesIcon} from "../icons/services.svg";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import Services from "../components/redesign/Services";
import UnitHeader from "../components/redesign/UnitHeader";
import OrganisationAdmins from "../components/redesign/OrganisationAdmins";
import {AppStore} from "../stores/AppStore";
import Collaborations from "../components/redesign/Collaborations";

class ServiceDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            service: {},
            loaded: false,
            tab: "admins",
            tabs: []
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id) {
            serviceById(params.id)
                .then(json => {
                    const tab = params.tab || this.state.tab;
                    const tabs = [
                        this.getOrganisationsTab(json),
                        this.getCollaborationsTab(json)
                    ];
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {path: "/", value: json.name}
                        ];
                    });
                    this.setState({
                        service: json,
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

    getOrganisationsTab = service => {
        return (<div key="admins" name="admins" label={I18n.t("home.tabs.orgAdmins")}
                     icon={<PlatformAdminIcon/>}>
            <OrganisationAdmins {...this.props} organisation={organisation}/>
        </div>)
    }

    getServicesTab = organisation => {
        return (<div key="services" name="services" label={I18n.t("home.tabs.orgServices")} icon={<ServicesIcon/>}>
            <Services {...this.props} organisation={organisation}/>
        </div>)
    }

    getCollaborationsTab = organisation => {
        return (<div key="collaborations" name="collaborations" label={I18n.t("home.tabs.orgCollaborations")}
                     icon={<CollaborationsIcon/>}>
            <Collaborations {...this.props} organisation={organisation}/>
        </div>)
    }

    render() {
        const {tabs, organisation, loaded, tab} = this.state;
        if (!loaded) {
            return null;
        }
        const {user} = this.props;
        return (
            <div className="mod-organisation-container">
                <UnitHeader obj={organisation} mayEdit={true} history={this.props.history}
                            auditLogPath={`organisations/${organisation.id}`}
                            name={organisation.name}
                            onEdit={() => this.props.history.push("/edit-organisation/" + organisation.id)}>
                    <p>{organisation.description}</p>
                    <div className="org-attributes-container">
                        <div className="org-attributes">
                            <span>{I18n.t("organisation.schacHomeOrganisation")}</span>
                            <span>{organisation.schac_home_organisation}</span>
                        </div>
                        <div className="org-attributes">
                            <span>{I18n.t("organisation.collaborationCreationAllowed")}</span>
                            <span>{I18n.t(`forms.${organisation.collaboration_creation_allowed ? "yes" : "no"}`)}</span>
                        </div>
                    </div>
                </UnitHeader>
                <Tabs tab={tab}>
                    {tabs}
                </Tabs>
            </div>);
    };
}

export default ServiceDetail;