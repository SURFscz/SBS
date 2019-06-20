import React from "react";
import {
    createOrganisation,
    organisationIdentifierExists,
    organisationNameExists,
    organisationShortNameExists
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./NewOrganisation.scss";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";

class NewOrganisation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            name: "",
            description: "",
            short_name: "",
            tenant_identifier: "",
            administrators: [],
            email: "",
            message: "",
            required: ["name", "short_name", "tenant_identifier"],
            alreadyExists: {},
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations")),
            leavePage: true,
        };
    }

    validateOrganisationName = e =>
        organisationNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationTenantIdentifier = e =>
        organisationIdentifierExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, tenant: json}});
        });

    validateOrganisationShortName = e =>
        organisationShortNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {name, short_name, tenant_identifier, administrators, message, description} = this.state;
            createOrganisation({name, short_name, tenant_identifier, administrators, message, description}).then(res => {
                this.props.history.push("/organisations");
                setFlash(I18n.t("organisation.flash.created", {name: res.name}))
            });
        }
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    removeMail = email => e => {
        stopEvent(e);
        const {administrators} = this.state;
        const newAdministrators = administrators.filter(currentMail => currentMail !== email);
        this.setState({administrators: newAdministrators});
    };

    addEmail = e => {
        const email = e.target.value;
        const {administrators} = this.state;
        const delimiters = [",", " ", ";"];
        let emails;
        if (!isEmpty(email) && delimiters.some(delimiter => email.indexOf(delimiter) > -1)) {
            emails = email.replace(/[;\s]/g, ",").split(",").filter(part => part.trim().length > 0 && validEmailRegExp.test(part));
        } else if (!isEmpty(email) && validEmailRegExp.test(email.trim())) {
            emails = [email];
        }
        if (isEmpty(emails)) {
            this.setState({email: ""});
        } else {
            const uniqueEmails = [...new Set(administrators.concat(emails))];
            this.setState({email: "", administrators: uniqueEmails});
        }
    };


    render() {
        const {
            name, description, tenant_identifier, email, initial, alreadyExists, administrators,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, short_name
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        //TODO based on the params of the path
        const disabled = false;
        return (
            <div className="mod-new-organisation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("organisation.deleteConfirmation")}
                                    leavePage={leavePage}/>
                <div className="title">
                    <a href="/organisations" onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/organisations`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("organisationDetail.backToOrganisations")}
                    </a>
                    <p className="title">{I18n.t("organisation.title")}</p>
                </div>

                <div className="new-organisation">
                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("organisation.namePlaceHolder")}
                                onBlur={this.validateOrganisationName}
                                name={I18n.t("organisation.name")}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.name").toLowerCase(),
                        value: name
                    })}</span>}
                    {(!initial && isEmpty(name)) && <span
                        className="error">{I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.name").toLowerCase()
                    })}</span>}

                    <InputField value={short_name}
                                name={I18n.t("organisation.shortName")}
                                placeholder={I18n.t("organisation.shortNamePlaceHolder")}
                                onBlur={this.validateOrganisationShortName}
                                onChange={e => this.setState({
                                    short_name: e.target.value,
                                    alreadyExists: {...this.state.alreadyExists, short_name: false}
                                })}
                                toolTip={I18n.t("organisation.shortNameTooltip")}/>
                    {alreadyExists.short_name && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.shortName").toLowerCase(),
                        value: short_name
                    })}</span>}
                    {(!initial && isEmpty(short_name)) && <span
                        className="error">{I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.shortName").toLowerCase()
                    })}</span>}

                    <InputField value={tenant_identifier}
                                onChange={e => this.setState({tenant_identifier: e.target.value})}
                                placeholder={I18n.t("organisation.tenantPlaceHolder")}
                                onBlur={this.validateOrganisationTenantIdentifier}
                                name={I18n.t("organisation.tenant_identifier")}/>
                    {alreadyExists.tenant && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.tenant_identifier").toLowerCase(),
                        value: tenant_identifier
                    })}</span>}
                    {(!initial && isEmpty(tenant_identifier)) && <span
                        className="error">{I18n.t("organisation.required", {
                        attribute: I18n.t("organisation.tenant_identifier").toLowerCase()
                    })}</span>}

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("organisation.descriptionPlaceholder")}
                                name={I18n.t("organisation.description")}/>

                    <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                                placeholder={I18n.t("organisation.administratorsPlaceholder")}
                                name={I18n.t("organisation.administrators")}
                                toolTip={I18n.t("organisation.administratorsTooltip")}
                                onBlur={this.addEmail}
                                onEnter={this.addEmail}/>

                    <section className="email-tags">
                        {administrators.map(mail =>
                            <div key={mail} className="email-tag">
                                <span>{mail}</span>
                                {disabled ?
                                    <span className="disabled"><FontAwesomeIcon icon="envelope"/></span> :
                                    <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>}
                            </div>)}
                    </section>

                    <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                placeholder={I18n.t("organisation.messagePlaceholder")}
                                name={I18n.t("organisation.message")}
                                toolTip={I18n.t("organisation.messageTooltip")}
                                multiline={true}/>

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("forms.submit")} onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewOrganisation;