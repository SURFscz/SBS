import React from "react";
import {allServices} from "../../api";
import "./Services.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Logo from "./Logo";
import SpinnerField from "./SpinnerField";


class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            loading: true
        }
    }

    componentDidMount = () => {
        allServices().then(services => {
            services.forEach(s => s.connection_requests_count = s.service_connection_requests.length)
            this.setState({services: services, loading: false})
        });
    }

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    render() {
        const {services, loading} = this.state;
        const {user} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: service => <Logo src={service.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.services.name"),
                mapper: service => <a href="/" onClick={this.openService(service)}>{service.name}</a>,
            },
            {
                key: "connection_requests_count",
                header: I18n.t("models.services.connectionRequestCount")
            },
            {
                key: "organisations_count",
                header: I18n.t("models.services.organisationCount")
            },
            {
                key: "collaborations_count",
                header: I18n.t("models.services.collaborationCount")
            }];
        return (
            <Entities entities={services} modelName="services" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={user.admin} newEntityPath={"/new-service"}
                      loading={loading}
                      rowLinkMapper={() => this.openService}
                      {...this.props}/>
        )
    }
}

export default Services;