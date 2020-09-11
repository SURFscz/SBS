import React from "react";
import {organisationByIdLite} from "../api";
import "./OrganisationDetail.scss";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import moment from "moment";
import BackLink from "../components/BackLink";
import CheckBox from "../components/CheckBox";

class OrganisationDetailLite extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: {},
        }
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            organisationByIdLite(params.id)
                .then(json => this.setState({organisation: json}))
                .catch(() => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    organisationDetails = (organisation) => {
        return <div className="organisation-detail">
            <div className="title">
                <p>{I18n.t("organisationDetail.title", {name: organisation.name})}</p>
            </div>

            <InputField value={organisation.name}
                        name={I18n.t("organisation.name")}
                        disabled={true}/>
            <InputField value={organisation.short_name}
                        name={I18n.t("organisation.shortName")}
                        disabled={true}/>
            <InputField value={organisation.identifier}
                        name={I18n.t("organisation.identifier")}
                        toolTip={I18n.t("organisation.identifierTooltip")}
                        disabled={true}
                        copyClipBoard={true}/>

            <InputField value={organisation.description}
                        name={I18n.t("organisation.description")}
                        disabled={true}/>

            <InputField value={organisation.schac_home_organisation}
                        disabled={true}
                        name={I18n.t("organisation.schacHomeOrganisation")}
                        toolTip={I18n.t("organisation.schacHomeOrganisationTooltip")}/>

            <CheckBox name={"collaboration_creation_allowed"}
                      value={organisation.collaboration_creation_allowed || false}
                      info={I18n.t("organisation.collaborationCreationAllowed")}
                      readOnly={true}
                      tooltip={I18n.t("organisation.collaborationCreationAllowedTooltip")}/>

            <InputField value={moment(organisation.created_at * 1000).format("LLLL")}
                        disabled={true}
                        name={I18n.t("organisation.created")}/>
        </div>;
    };

    render() {
        const {organisation} = this.state;
        return (
            <div className="mod-organisation-detail">
                <BackLink history={this.props.history} fullAccess={false} role={I18n.t("access.coAdmin")}/>
                <div label="form">
                    {this.organisationDetails(organisation)}
                </div>
            </div>)
    }


}

export default OrganisationDetailLite;