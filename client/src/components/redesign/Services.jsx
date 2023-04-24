import React from "react";
import {allServices, mineServices} from "../../api";
import "./Services.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Logo from "./Logo";
import SpinnerField from "./SpinnerField";
import {isUserServiceAdmin} from "../../utils/UserRole";


class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            services: [],
            loading: true
        }
    }

    componentDidMount = () => {
        const {user} = this.props;
        let promise;
        if (user.admin) {
            promise = allServices(true);
        } else if (isUserServiceAdmin(user)) {
            promise = mineServices()
        } else {
            this.props.history.push("/404");
            return;
        }
        promise.then(services => {
            services.forEach(s => s.connection_requests_count = s.service_connection_requests.length)
            this.setState({services: services, loading: false})
        });
    }

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
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
                mapper: service => <a href={`/services/${service.id}`}
                                      className={"neutral-appearance"}
                                      onClick={this.openService(service)}>{service.name}</a>,
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
            <Entities entities={services}
                      modelName="services"
                      searchAttributes={["name", "entity_id"]}
                      defaultSort="name"
                      columns={columns}
                      showNew={user.admin}
                      newEntityPath={"/new-service"}
                      loading={loading}
                      hideTitle={true}
                      rowLinkMapper={() => this.openService}
                      {...this.props}/>
        )
    }
}

export default Services;