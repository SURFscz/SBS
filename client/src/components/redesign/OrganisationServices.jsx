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
            const filteredServices = services
                .filter(service => {
                    const allowed = service.allowed_organisations.some(org => org.id === organisation.id);
                    return allowed || (service.allowed_organisations.length === 0 &&
                    service.automatic_connection_allowed);
                });
            this.setState({services: filteredServices, loading: false});
        });
    }

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    getServiceLink = entity => {
        return <a href="/" onClick={this.openService(entity)}>{entity.name}</a>
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true});
        promise.then(() => {
            this.props.refresh(() => {
                this.componentDidMount();
                setFlash(flashMsg);
                callback && callback();
            });
        });
    }

    onToggle = (service, organisation) => selected => {
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

    getServiceAction = service => {
        const {organisation, user} = this.props;
        const allowed = isUserAllowed(ROLES.ORG_MANAGER, user, organisation.id, null);
        const inUse = organisation.services.some(s => s.id === service.id);
        return <ToggleSwitch onChange={this.onToggle(service, organisation)} disabled={!allowed}
                             value={inUse} animate={false}/>
    }

    render() {
        const {
            services, loading
        } = this.state;
        const {organisation} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        services.forEach(service => service.inUse = organisation.services.some(s => s.id === service.id));
        organisation.services.forEach(service => service.inUse = true);
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
                key: "inUse",
                header: I18n.t("models.services.mandatory"),
                mapper: this.getServiceAction
            }]
        const titleUsed = I18n.t(`models.services.titleUsedOrg`, {count: organisation.services.length});
        return (
            <div>

                <Entities entities={services}
                          modelName="servicesUsed"
                          tableClassName="organisationServicesUsed"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          loading={loading}
                          title={titleUsed}
                          explain={<OrganisationServicesExplanation/>}
                          {...this.props}/>
            </div>
        )
    }
}

export default OrganisationServices;