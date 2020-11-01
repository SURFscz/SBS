import React from "react";
import {allServices, myServices} from "../../api";
import "./Services.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";


class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            loading: true
        }
    }

    componentDidMount = () => {
        const {user, organisation} = this.props;
        const promise = user.admin ? allServices() : myServices();
        promise.then(json => {
            let services = json;
            if (organisation) {
                services = services.filter(service => service.allowed_organisations.length === 0 ||
                    service.allowed_organisations.some(org => org.id === organisation.id))
            }
            this.setState({services: services, loading: false});
        });
    }


    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    render() {
        const {services, loading} = this.state;
        const {organisation, collaboration} = this.props;

        if (isEmpty(services) && !loading) {
            return <div>TODO - No services yet</div>
        }

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: service => service.logo && <img src={`data:image/jpeg;base64,${service.logo}`}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: service => <a href="/" onClick={this.openService(service)}>{service.name}</a>,
            }]
        if (organisation) {
            //TODO - ensure we can select services to add to the organisation
        } else if (collaboration) {
            //TODO - ensure we can select services to add to the collaboration
        } else {
            columns.push({
                key: "organisations_count",
                header: I18n.t("models.services.organisationCount")
            });
            columns.push({
                key: "collaborations_count",
                header: I18n.t("models.services.collaborationCount")
            });
        }
        return (
            <Entities entities={services} modelName="services" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={true} newEntityPath={"/new-service"}
                      loading={loading}
                      {...this.props}/>
        )
    }
}

export default Services;