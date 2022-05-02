import React from "react";
import "./ServicesWithoutAdmin.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Logo from "./Logo";


class ServicesWithoutAdmin extends React.Component {

    openService = service => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    render() {
        const {services} = this.props;
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
                mapper: service => <a href={`/services/${service.id}`} onClick={this.openService(service)}>{service.name}</a>,
            },
            {
                key: "contact_email",
                header:  I18n.t("service.contact_email"),
                mapper: service => service.contact_email? service.contact_email : "-"
            }]
        return (
            <Entities entities={services}
                      modelName="servicesWithoutAdmin"
                      searchAttributes={["name"]}
                      defaultSort="name"
                      columns={columns}
                      rowLinkMapper={() => this.openService}
                      loading={false}
                      {...this.props}/>
        )
    }
}

export default ServicesWithoutAdmin;