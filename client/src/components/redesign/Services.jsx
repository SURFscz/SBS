import React from "react";
import {allServices} from "../../api";
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
        allServices().then(services => this.setState({services: services, loading: false}));
    }

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    render() {
        const {services, loading} = this.state;
        const {user} = this.props;
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
                      {...this.props}/>
        )
    }
}

export default Services;