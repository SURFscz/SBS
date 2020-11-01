import React from "react";
import {allOrganisations, myOrganisations} from "../../api";
import "./Organisations.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import ToggleSwitch from "./ToggleSwitch";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            loading: true
        }
    }

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    render() {
        const {organisations, loading} = this.state;

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => org.logo && <img src={`data:image/jpeg;base64,${org.logo}`}/>
            },
            {
                key: "name",
                header: I18n.t("models.organisations.name"),
                mapper: org => <a href="/" onClick={this.openOrganisation(org)}>{org.name}</a>,
            },
            {
                key: "category",
                header: I18n.t("models.organisations.category")
            },
            {
                key: "toggle",
                header: I18n.t("models.services.accessAllowed"),
                mapper: org => {
                    return new ToggleSwitch()
                }
            }]
        return (
            <Entities entities={organisations} modelName="organisations" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={true} newEntityPath={"/new-organisation"}
                      loading={loading}
                      {...this.props}/>
        )
    }
}

export default Organisations;