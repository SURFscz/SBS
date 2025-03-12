import React from "react";
import {allOrganisations, myOrganisations} from "../../api";
import "./Organisations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Logo from "./Logo";
import SpinnerField from "./SpinnerField";
import {Chip, Tooltip} from "@surfnet/sds";
import {chipType} from "../../utils/UserRole";


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
                    const membership = (user.organisation_memberships || []).find(m => m.organisation_id === org.id);
                    org.role = membership ? membership.role : null;
                    org.schacHomes = isEmpty(org.schac_home_organisations) ? "-" : org.schac_home_organisations.map(sho => sho.name).join(", ");
                });
                this.setState({organisations: json, loading: false})
            });
    }

    openOrganisation = organisation => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    renderSchacHome = (schacHome, index) => {
        const splitUp = schacHome.replace(/(.{25})/g,"$1<br/>")
        if (schacHome.length > 35) {
            return <div className="schac_home_container" key={`${schacHome}_${index}`}>
                <span className="schac_home">{schacHome}</span>
                <Tooltip tip={splitUp}/>
            </div>
        } else {
            return <span className="schac_home" key={`${schacHome}_${index}`}>{schacHome}</span>;
        }
    }

    render() {
        const {user: currentUser} = this.props;
        const {organisations, loading} = this.state;
        if (loading) {
            return <SpinnerField/>
        }

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
                mapper: org => isEmpty(org.schac_home_organisations) ? "-" :
                    <div className={"schac_home_organisations"}>
                        {org.schac_home_organisations.map((sho, index) => this.renderSchacHome(sho.name,index))}
                    </div>
            },
            {
                key: "role",
                header: I18n.t("profile.yourRole"),
                mapper: org => {
                    if (org.role) {
                        return <Chip label={I18n.t(`profile.${org.role}`)}
                                     type={chipType(org)}/>
                    }
                    return null;
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
                      searchAttributes={["name", "schacHomes", "short_name", "identifier"]}
                      defaultSort="name"
                      inputFocus={true}
                      columns={columns}
                      title={`${I18n.t("home.tabs.organisations")} (${organisations.length})`}
                      rowLinkMapper={() => this.openOrganisation}
                      showNew={currentUser.admin}
                      newEntityPath={"/new-organisation"}
                      loading={loading}
                      {...this.props}/>
        )
    }
}

export default Organisations;