import React from "react";
import {
    createOrganisation,
    health,
    organisationNameExists,
    organisationSchacHomeOrganisationExists,
    organisationShortNameExists
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./NewOrganisation.scss";
import Button from "../components/Button";
import {ReactComponent as OrganisationsIcon} from "../icons/organisations.svg";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {sanitizeShortName, validEmailRegExp} from "../validations/regExps";
import CheckBox from "../components/CheckBox";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import RadioButton from "../components/redesign/RadioButton";
import ImageField from "../components/redesign/ImageField";
import SelectField from "../components/SelectField";

class NewOrganisation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const categoryOptions = props.config.organisation_categories.map(c => ({value: c, label: c}));
        const category = categoryOptions[0];
        this.state = {
            name: "",
            description: "",
            short_name: "",
            schac_home_organisation: "",
            collaboration_creation_allowed: false,
            logo: "",
            categoryOptions: categoryOptions,
            category: category,
            administrators: [],
            email: "",
            message: "",
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations")),
            leavePage: true,
        };
    }

    componentDidMount = () => {
        health().then(() => {
            AppStore.update(s => {
                s.breadcrumb.paths = [
                    {path: "/", value: I18n.t("breadcrumb.home")},
                    {path: "/", value: I18n.t("breadcrumb.newOrganisation")}
                ];
            });
        })
    }

    validateOrganisationName = e =>
        organisationNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateOrganisationShortName = e =>
        organisationShortNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    validateOrganisationSchacHome = e =>
        organisationSchacHomeOrganisationExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, schac_home_organisation: json}});
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
            const {name, short_name, administrators, message, schac_home_organisation, description, logo, category} = this.state;
            createOrganisation({
                name,
                short_name,
                category: category.label,
                schac_home_organisation,
                administrators,
                message,
                description,
                logo
            }).then(res => {
                this.props.history.goBack();
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

    //TODO - no mail in newOrganisation
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
            name, description, email, initial, alreadyExists, administrators,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, short_name,
            schac_home_organisation, collaboration_creation_allowed, logo, category, categoryOptions
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const disabled = false;
        const {user} = this.props;
        return (
            <div className="mod-new-organisation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("organisation.deleteConfirmation")}
                                    leavePage={leavePage}/>
                <UnitHeader obj={({name: I18n.t("models.organisations.new"), svg: OrganisationsIcon})}/>

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
                                    short_name: sanitizeShortName(e.target.value),
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

                    <ImageField name="logo" onChange={s => this.setState({logo:s})}
                                title={I18n.t("organisation.logo")} value={logo}/>

                    <SelectField value={category}
                                 options={categoryOptions}
                                 name={I18n.t("organisation.category")}
                                 onChange={e => this.setState({category: e})}/>

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("organisation.descriptionPlaceholder")} multiline={true}
                                name={I18n.t("organisation.description")}/>

                    <InputField value={schac_home_organisation}
                                onChange={e => this.setState({
                                    schac_home_organisation: e.target.value,
                                    alreadyExists: {...this.state.alreadyExists, schac_home_organisation: false}
                                })}
                                placeholder={I18n.t("organisation.schacHomeOrganisationPlaceholder")}
                                name={I18n.t("organisation.schacHomeOrganisation")}
                                onBlur={this.validateOrganisationSchacHome}
                                toolTip={I18n.t("organisation.schacHomeOrganisationTooltip")}/>
                    {alreadyExists.schac_home_organisation && <span
                        className="error">{I18n.t("organisation.alreadyExists", {
                        attribute: I18n.t("organisation.schacHomeOrganisation").toLowerCase(),
                        value: schac_home_organisation
                    })}</span>}
                    <RadioButton
                        label={I18n.t("organisation.collaborationCreationAllowed")}
                        name={"collaboration_creation_allowed"}
                        disabled={isEmpty(schac_home_organisation)}
                        value={collaboration_creation_allowed}
                        tooltip={I18n.t("organisation.collaborationCreationAllowedTooltip")}
                        onChange={val => this.setState({collaboration_creation_allowed: val})}/>
                    {/*<InputField value={email} onChange={e => this.setState({email: e.target.value})}*/}
                    {/*            placeholder={I18n.t("organisation.administratorsPlaceholder")}*/}
                    {/*            name={I18n.t("organisation.administrators")}*/}
                    {/*            toolTip={I18n.t("organisation.administratorsTooltip")}*/}
                    {/*            onBlur={this.addEmail}*/}
                    {/*            onEnter={this.addEmail}/>*/}

                    {/*<section className="email-tags">*/}
                    {/*    {administrators.map(mail =>*/}
                    {/*        <div key={mail} className="email-tag">*/}
                    {/*            <span>{mail}</span>*/}
                    {/*            {disabled ?*/}
                    {/*                <span className="disabled"><FontAwesomeIcon icon="envelope"/></span> :*/}
                    {/*                <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>}*/}
                    {/*        </div>)}*/}
                    {/*</section>*/}

                    {/*<InputField value={message} onChange={e => this.setState({message: e.target.value})}*/}
                    {/*            placeholder={I18n.t("organisation.messagePlaceholder")}*/}
                    {/*            name={I18n.t("organisation.message")}*/}
                    {/*            toolTip={I18n.t("organisation.messageTooltip")}*/}
                    {/*            multiline={true}/>*/}

                    <section className="actions">
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                        <Button disabled={disabledSubmit} txt={I18n.t("forms.submit")} onClick={this.submit}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewOrganisation;