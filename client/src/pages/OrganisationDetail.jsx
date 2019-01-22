import React from "react";
import {organisationById, organisationIdentifierExists, organisationNameExists} from "../api";
import "./OrganisationDetail.scss";
import ReactJson from 'react-json-view'
import I18n from "i18n-js";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InputField from "../components/InputField";
import {isEmpty} from "../utils/Utils";

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            originalOrganisation: null,
            organisation: null,
            required: ["name", "tenant_identifier"],
            alreadyExists: {},
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations")),
            leavePage: true,

        }
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            organisationById(params.id)
                .then(json => this.setState({originalOrganisation: json, organisation: {...json}}))
                .catch(e => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    validateOrganisationName = e =>
        organisationNameExists(e.target.value, this.state.originalOrganisation.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationTenantIdentifier = e =>
        organisationIdentifierExists(e.target.value, this.state.originalOrganisation.tenant_identifier).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, tenant: json}});
        });

    render() {
        const {
            organisation, initial, alreadyExists,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage
        } = this.state;
        if (!organisation) {
            return null;
        }
        return (
            <div className="mod-organisation-detail">
                <p className="title">{I18n.t("organisationDetail.title", {name: organisation.name})}</p>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("organisation.deleteConfirmation")}
                                    leavePage={leavePage}/>
                <div className="organisation-detail">
                    <InputField value={organisation.name} onChange={e => {
                        this.setState({
                            organisation: {...organisation, name: e.target.value},
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("organisation.namePlaceHolder")}
                                onBlur={this.validateOrganisationName}
                                name={I18n.t("organisation.name")}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.name").toLowerCase(),
                        value: organisation.name
                    })}</span>}
                    {(!initial && isEmpty(organisation.name)) && <span
                        className="error">{I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.name").toLowerCase()
                    })}</span>}

                    <InputField value={organisation.tenant_identifier}
                                onChange={e => this.setState({
                                    organisation: {...organisation, tenant_identifier: e.target.value},
                                    alreadyExists: {...this.state.alreadyExists, tenant_identifier: false}
                                })}
                                placeholder={I18n.t("organisation.tenantPlaceHolder")}
                                onBlur={this.validateOrganisationTenantIdentifier}
                                name={I18n.t("organisation.tenant_identifier")}/>
                    {alreadyExists.tenant && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.tenant_identifier").toLowerCase(),
                        value: organisation.tenant_identifier
                    })}</span>}
                    {(!initial && isEmpty(organisation.tenant_identifier)) && <span
                        className="error">{I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.tenant_identifier").toLowerCase()
                    })}</span>}

                    <InputField value={organisation.description} onChange={e => this.setState({
                        organisation: {
                            ...organisation,
                            description: e.target.value
                        }
                    })}
                                placeholder={I18n.t("organisation.descriptionPlaceholder")}
                                name={I18n.t("organisation.description")}/>

                </div>
                <ReactJson src={organisation} root="organisation" displayObjectSize={false} displayDataTypes={false}
                           enableClipboard={false}/>
            </div>)
    }
}

export default OrganisationDetail;