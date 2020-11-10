import React from "react";
import {allOrganisations, myOrganisations} from "../../api";
import "./Organisations.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";


class Organisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            loading: true
        }
    }

    componentDidMount = () => {
        const {user} = this.props;
        const promise = user.admin ? allOrganisations() : myOrganisations();
        promise
            .then(json => {
                json.forEach(org => {
                    const membership = (user.organisation_memberships || []).find(m => m.user_id === user.id);
                    org.role = membership ? membership.role : "";
                });
                this.setState({organisations: json, loading: false})
            });
    }

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    render() {
        const {user: currentUser} = this.props;
        const {organisations, loading} = this.state;

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => org.logo && <img src={`data:image/jpeg;base64,${org.logo}`} alt=""/>
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
                key: "organisation_memberships_count",
                header: I18n.t("models.organisations.memberCount"),
                mapper: org => org.organisation_memberships_count
            },
            {
                key: "collaborations_count",
                header: I18n.t("models.organisations.collaborationCount"),
                mapper: org => org.collaborations_count
            }]
        return (
            <Entities entities={organisations}
                      modelName="organisations" searchAttributes={["name"]}
                      defaultSort="name"
                      columns={columns}
                      rowLinkMapper={() => this.openOrganisation}
                      showNew={currentUser.admin}
                      newEntityPath={"/new-organisation"}
                      loading={loading}
                      {...this.props}/>
        )
    }
}

export default Organisations;