import React from "react";
import {allOrganisations, myOrganisations} from "../../api";
import "./Organisations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Logo from "./Logo";


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
                    org.schacHomes = isEmpty(org.schac_home_organisations) ? "-" :  org.schac_home_organisations.map(sho => sho.name).join(", ");
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
                mapper: org => <Logo src={org.logo}/>
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
                key: "schacHomes",
                header: I18n.t("models.organisations.schacHomeOrganisations"),
                mapper: org => org.schacHomes,
            },
            {
                key: "role",
                header: "",// I18n.t("profile.yourRole"),
                mapper: org => {
                    const cm = currentUser.organisation_memberships.find(m => m.organisation_id === org.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
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
                      modelName="organisations"
                      searchAttributes={["name","schacHomes"]}
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