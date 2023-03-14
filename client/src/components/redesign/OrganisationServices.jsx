import React from "react";
import {addOrganisationServices, allServices, deleteOrganisationServices} from "../../api";

import "./OrganisationServices.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";

import {setFlash} from "../../utils/Flash";
import SpinnerField from "./SpinnerField";
import OrganisationServicesExplanation from "../explanations/OrganisationServices";
import ToggleSwitch from "./ToggleSwitch";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import Logo from "./Logo";
import ConfirmationDialog from "../ConfirmationDialog";
import {Tooltip} from "@surfnet/sds";

class OrganisationServices extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            loading: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
        }
    }

    componentDidMount = () => {
        const {organisation} = this.props;
        allServices().then(services => {
            services.forEach(service => {
                service.disabled = !organisation.services.some(s => s.id === service.id);
            });
            this.setState({services: services, loading: false});
        });
    }

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    getServiceLink = entity => {
        return <a href={`/services/${entity.id}`} onClick={this.openService(entity)}>{entity.name}</a>
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true, confirmationDialogOpen: false});
        promise.then(() => {
            this.props.refresh(() => {
                this.componentDidMount();
                setFlash(flashMsg);
                callback && callback();
            });
        });
    }

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action,
        });
    };

    onToggle = (service, organisation, showConfirmation = true) => selected => {
        if (!selected && showConfirmation) {
            const action = () => this.onToggle(service, organisation, false)(selected);
            this.confirm(action, I18n.t("models.services.confirmations.remove", {
                service: service.name,
                name: organisation.name
            }), true);
        } else {
            const promise = selected ? addOrganisationServices(organisation.id, service.id) : deleteOrganisationServices(organisation.id, service.id);
            const flashMsg = selected ? I18n.t("organisationServices.flash.added", {
                service: service.name,
                name: organisation.name
            }) : I18n.t("organisationServices.flash.deleted", {
                service: service.name,
                name: organisation.name
            });
            this.refreshAndFlash(promise, flashMsg);
        }
    }

    getServiceAction = service => {
        const {organisation, user} = this.props;
        const allowed = isUserAllowed(ROLES.ORG_MANAGER, user, organisation.id, null);
        let tooltip = null;
        const trusted_org = service.automatic_connection_allowed_organisations.some(org => org.id === organisation.id)
        const allowed_org = service.allowed_organisations.some(org => org.id === organisation.id) || trusted_org;
        if (!service.allow_restricted_orgs && organisation.services_restricted) {
            tooltip = I18n.t("organisationServices.serviceRestrictedOrganisation");
        } else if (!service.access_allowed_for_all && !allowed_org) {
            tooltip = I18n.t("organisationServices.notEnabledOrganisation");
        } else if (!service.automatic_connection_allowed && !trusted_org) {
            tooltip = I18n.t("organisationServices.notAllowedOrganisation");
        }
        return (
            <div className={"toggle-switch-container"}>
                <div className={"toggle-switch-inner-container"}>
                    {(allowed && !tooltip) &&
                    <ToggleSwitch onChange={this.onToggle(service, organisation)}
                                  value={organisation.services.some(s => s.id === service.id)}
                                  animate={false}
                                  tooltip={tooltip}/>}
                    {tooltip &&
                    <Tooltip tip={tooltip} standalone={true}/>}
                </div>
            </div>
        )
    }

    render() {
        const {
            services, loading, confirmationDialogOpen, confirmationDialogQuestion, confirmationDialogAction,
            cancelDialogAction
        } = this.state;
        const {organisation} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: entity => <Logo src={entity.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: this.getServiceLink,
            },
            {
                key: "allowed",
                header: I18n.t("models.services.mandatory"),
                mapper: this.getServiceAction
            }]
        const count = organisation.services.length
        const titleUsed = I18n.t(`models.services.titleUsedOrg`, {count: count});
        return (
            <div className="organisation-services">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={true}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>

                <Entities entities={services}
                          modelName="servicesUsed"
                          tableClassName="organisationServicesUsed"
                          searchAttributes={["name"]}
                          defaultSort="disabled"
                          columns={columns}
                          loading={loading}
                          title={titleUsed}
                          hideTitle={true}
                          explain={<OrganisationServicesExplanation/>}
                          explainTitle={I18n.t("explain.services")}
                          {...this.props}/>
            </div>
        )
    }
}

export default OrganisationServices;