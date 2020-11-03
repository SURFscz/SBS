import React from "react";
import {allServices} from "../../api";
import "./UsedServices.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import Button from "../Button";

class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            forOrganisation: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {organisation, collaboration} = this.props;
        allServices().then(json => {
            let services = json;
            const forOrganisation = !isEmpty(organisation);

            let servicesInUse = forOrganisation ? organisation.services : collaboration.services.concat(collaboration.organisation.services);
            if (!forOrganisation) {
                servicesInUse = servicesInUse.concat(collaboration.service_connection_requests.map(r => r.service));
            }
            servicesInUse = servicesInUse.map(e => e.id);
            services = services.filter(service => {
                const orgId = organisation ? organisation.id : collaboration.organisation_id;
                return (service.allowed_organisations.length === 0 ||
                    service.allowed_organisations.some(org => org.id === orgId)) &&
                    servicesInUse.indexOf(service.id) === -1;
            });
            this.setState({services: services, forOrganisation: forOrganisation, loading: false});
        });
    }

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    getLogo = entity => {
        if (entity.logo) {
            return <img src={`data:image/jpeg;base64,${entity.logo}`}/>
        }
        if (entity.connectionRequest && entity.service.logo) {
            return <img src={`data:image/jpeg;base64,${entity.service.logo}`}/>
        }
        return <NotFoundIcon/>
    }
    getServiceLink = entity => {
        const ref = entity.connectionRequest ? entity.service : entity;
        return <a href="/" onClick={this.openService(ref)}>{ref.name}</a>
    }


    getServiceStatus = service => {if (service.usedService) {
            service.status = service.connectionRequest ? I18n.t("models.services.awaitingApproval") : ""
        } else {
        service.status = service.automatic_connection_allowed ? I18n.t("models.services.automaticConnectionAllowed") : "";
        }
        return service.status;

    }

    getServiceAction = service => {
        const {services, loading, forOrganisation} = this.state;
        const {organisation, collaboration, user} = this.props;
        if (service.usedService && !service.connectionRequest && !forOrganisation && collaboration.organisation.services.some(s => s.id === service.id)) {
            return I18n.t("models.services.requiredByOrganisation");
        }
        return <Button className={"white"} onClick={() => alert("hu")} txt={"todo"}/>
    }

    render() {
        const {services, loading, forOrganisation} = this.state;
        const {organisation, collaboration, user} = this.props;
        let usedServices = forOrganisation ? organisation.services : collaboration.services.concat(collaboration.organisation.services);
        if (!forOrganisation) {
            const serviceConnectionRequests = collaboration.service_connection_requests;
            serviceConnectionRequests.forEach(req => req.connectionRequest = true);
            usedServices = usedServices.concat(serviceConnectionRequests);
        }
        usedServices.forEach(s => s.usedService = true);
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: this.getLogo
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: this.getServiceLink,
            },
            {
                key: "status",
                header: I18n.t("models.services.status"),
                mapper: this.getServiceStatus
            },
            {
                key: "action",
                header: "",
                mapper: this.getServiceAction
            }]
        const titleUsed = I18n.t(`models.services.${forOrganisation ? "titleUsedOrg" : "titleUsedColl"}`, {count: usedServices.length});
        const titleAvailable = I18n.t(`models.services.${forOrganisation ? "titleAvailableOrg" : "titleAvailableColl"}`, {count: services.length});
        return (
            <div>
                <Entities entities={usedServices} modelName="servicesAvailable" searchAttributes={["name"]}
                          defaultSort="name" columns={columns} loading={loading} title={titleUsed}
                          {...this.props}/>
                <Entities entities={services} modelName="servicesAvailable" searchAttributes={["name"]}
                          defaultSort="name" columns={columns} loading={loading} title={titleAvailable}
                          {...this.props}/>
            </div>
        )
    }
}

export default Services;