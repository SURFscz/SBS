import React from "react";
import "./Home.scss";
import {health, organisationIdentifierExists, organisationNameExists} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./NewOrganisation.scss";

class NewOrganisation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            name: "",
            description: "",
            tenant_identifier: "",
            members: [],
            required: {},
            alreadyExists: {},
        };
    }

    componentWillMount = () => {
        health().then(json => true);
    };

    validateOrganisationName = e =>
        organisationNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationTenantIdentifier = e =>
        organisationIdentifierExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, tenant: json}});
        });

    render() {
        const {name, description, tenant_identifier, members, required, alreadyExists} = this.state;
        return (
            <div className="mod-new-organisation">
                <div className="new-organisation">
                    <p className="title">{I18n.t("organisation.title")}</p>

                    <InputField value={name} onChange={e => this.setState({name: e.target.value})}
                                placeholder={I18n.t("organisation.namePlaceHolder")}
                                onBlur={this.validateOrganisationName}
                                name={I18n.t("organisation.name")}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.name").toLowerCase(),
                        value: name
                    })}</span>}

                    <InputField value={tenant_identifier}
                                onChange={e => this.setState({tenant_identifier: e.target.value})}
                                placeholder={I18n.t("organisation.tenantPlaceHolder")}
                                onBlur={this.validateOrganisationTenantIdentifier}
                                name={I18n.t("organisation.tenant")}/>
                    {alreadyExists.tenant && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.tenant").toLowerCase(),
                        value: tenant_identifier
                    })}</span>}

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("organisation.descriptionPlaceholder")}
                                name={I18n.t("organisation.description")}/>
                </div>
            </div>);
    };
}

export default NewOrganisation;