import React from "react";
import {allServicesOptimized, mineServicesOptimized} from "../../../api";
import "./Services.scss";
import {stopEvent} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Logo from "../logo/Logo";
import SpinnerField from "../spinner-field/SpinnerField";
import {isUserServiceAdmin} from "../../../utils/UserRole";


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
            promise = allServicesOptimized(true);
        } else if (isUserServiceAdmin(user)) {
            promise = mineServicesOptimized()
        } else {
            this.props.history.push("/404");
            return;
        }
        promise.then(services =>
            this.setState({services: services, loading: false})
        );
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
                key: "collaborations_count",
                header: I18n.t("models.services.collaborationCount")
            }];
        const userServiceAdmin = isUserServiceAdmin(user);
        return (
            <Entities entities={services}
                      modelName="services"
                      searchAttributes={["name", "entity_id", "abbreviation"]}
                      defaultSort="name"
                      columns={columns}
                      inputFocus={true}
                      newLabel={user.admin ? I18n.t("models.services.new") : I18n.t("header.links.requestService")}
                      showNew={user.admin || userServiceAdmin}
                      newEntityPath={user.admin ? "/new-service" : "/new-service-request"}
                      loading={loading}
                      title={`${I18n.t("home.tabs.services")} (${services.length})`}
                      rowLinkMapper={() => this.openService}
                      {...this.props}/>
        )
    }
}

export default Services;
