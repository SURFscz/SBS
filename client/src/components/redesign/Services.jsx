import React from "react";
import {allServices, myServices} from "../../api";
import "./Services.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";


class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: []
        }
    }

    componentDidMount = () => {
        const {user} = this.props;
        const promise = user.admin ? allServices() : myServices();
        promise.then(json => {
                this.setState({services: json});
            });
    }


    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    render() {
        const {services} = this.state;

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
            },
            {
                key: "organisations_count",
                header: I18n.t("models.services.organisationCount")
            },
            {
                key: "collaborations_count",
                header: I18n.t("models.services.collaborationCount")
            }]
        return (
            <Entities entities={services} modelName="services" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={true} newEntityPath={"new-service"}
                      {...this.props}/>
        )
    }
}

export default Services;