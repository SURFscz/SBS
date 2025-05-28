import React from "react";
import "./OrganisationsWithoutAdmin.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./entities/Entities";
import Logo from "./Logo";
import {clearFlash} from "../../utils/Flash";


class OrganisationsWithoutAdmin extends React.Component {

    openOrganisation = organisation => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    render() {
        const {organisations} = this.props;
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
                mapper: org => <a href={`/organisations/${org.id}`}
                                  className={"neutral-appearance"}
                                  onClick={this.openOrganisation(org)}>{org.name}</a>,
            },
            {
                key: "category",
                header: I18n.t("models.organisations.category")
            },
            {
                key: "schacHomes",
                header: I18n.t("models.organisations.schacHomeOrganisations"),
                mapper: org => isEmpty(org.schac_home_organisations) ? "-" : org.schac_home_organisations.map(sho => sho.name).join(", "),
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
                      modelName="organisationsWithoutAdmin"
                      searchAttributes={["name", "schacHomes"]}
                      defaultSort="name"
                      columns={columns}
                      rowLinkMapper={() => this.openOrganisation}
                      loading={false}
                      {...this.props}/>
        )
    }
}

export default OrganisationsWithoutAdmin;
