import React from "react";
import "./NewCollaboration.scss";
import {collaborationNameExists, collaborationShortNameExists, createCollaboration, myOrganisationsLite} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";
import {collaborationAccessTypes} from "../forms/constants";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";

class NewCollaboration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.accessTypeOptions = collaborationAccessTypes.map(type => ({
            value: type,
            label: I18n.t(`accessTypes.${type}`)
        }));
        this.state = {
            name: "",
            short_name: "",
            description: "",
            access_type: this.accessTypeOptions[0].value,
            administrators: [this.props.user.email],
            message: "",
            email: "",
            accepted_user_policy: "",
            enrollment: "",
            status: "",
            required: ["name", "short_name", "organisation"],
            alreadyExists: {},
            organisation: {},
            organisations: [],
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations")),
            leavePage: true,
        };
    }

    componentDidMount = () => {
        myOrganisationsLite().then(json => {
            if (json.length === 0) {
                this.props.history.push("/404");
            } else {
                const organisationId = getParameterByName("organisation", window.location.search);
                const organisations = json.map(org => ({
                    label: org.name,
                    value: org.id,
                    short_name: org.short_name
                }));
                let organisation = {};
                if (organisationId) {
                    const filtered = organisations.filter(org => org.value === parseInt(organisationId, 10));
                    if (filtered.length > 0) {
                        organisation = filtered[0];
                    }
                } else {
                    organisation = organisations[0];
                }
                this.setState({
                    organisations: organisations,
                    organisation: organisation
                });
            }
        });
    };
    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.organisation.value).then(json => {
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
            const {
                name, short_name, description, access_type, enrollment,
                administrators, message, accepted_user_policy, organisation
            } = this.state;
            createCollaboration({
                name, short_name, description, enrollment, access_type,
                administrators, message, accepted_user_policy, organisation_id: organisation.value
            }).then(res => {
                this.props.history.push("/home");
                setFlash(I18n.t("collaboration.flash.created", {name: res.name}));
                this.props.refreshUser();
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
            name, short_name, description, administrators, message, accepted_user_policy, organisation, organisations, email, initial, alreadyExists,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const disabled = false;
        return (
            <div className="mod-new-collaboration">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={leavePage ? undefined : I18n.t("collaboration.deleteConfirmation")}
                                    leavePage={leavePage}/>
                <div className="title">
                    <a href="/collaborations" onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/collaborations`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("collaborationDetail.backToCollaborations")}
                    </a>
                    <p className="title">{I18n.t("collaboration.title")}</p>
                </div>

                <div className="new-collaboration">
                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.namePlaceHolder")}
                                onBlur={this.validateCollaborationName}
                                name={I18n.t("collaboration.name")}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.name").toLowerCase(),
                        value: name,
                        organisation: organisation.label
                    })}</span>}
                    {(!initial && isEmpty(name)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.name").toLowerCase()
                    })}</span>}

                    <InputField value={short_name} onChange={e => {
                        this.setState({
                            short_name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                onBlur={this.validateCollaborationShortName}
                                toolTip={I18n.t("collaboration.shortNameTooltip")}
                                name={I18n.t("collaboration.shortName")}/>
                    {alreadyExists.short_name && <span
                        className="error">{I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase(),
                        value: short_name,
                        organisation: organisation.label
                    })}</span>}
                    {(!initial && isEmpty(short_name)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase()
                    })}</span>}

                    <InputField value={`${organisation.short_name}:${short_name}`}
                                name={I18n.t("collaboration.globalUrn")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.globalUrnTooltip")}
                                disabled={true}/>

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                                name={I18n.t("collaboration.description")}/>

                    <InputField value={accepted_user_policy}
                                onChange={e => this.setState({accepted_user_policy: e.target.value})}
                                placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                name={I18n.t("collaboration.accepted_user_policy")}/>

                    {/*<InputField value={enrollment}*/}
                    {/*            onChange={e => this.setState({enrollment: e.target.value})}*/}
                    {/*            placeholder={I18n.t("collaboration.enrollmentPlaceholder")}*/}
                    {/*            toolTip={I18n.t("collaboration.enrollmentTooltip")}*/}
                    {/*            name={I18n.t("collaboration.enrollment")}/>*/}

                    {/*<SelectField value={this.accessTypeOptions.find(option => option.value === access_type)}*/}
                    {/*             options={this.accessTypeOptions}*/}
                    {/*             name={I18n.t("collaboration.access_type")}*/}
                    {/*             placeholder={I18n.t("collaboration.accessTypePlaceholder")}*/}
                    {/*             onChange={selectedOption => this.setState({access_type: selectedOption ? selectedOption.value : null})}*/}
                    {/*/>*/}

                    <SelectField value={organisation}
                                 options={organisations}
                                 name={I18n.t("collaboration.organisation_name")}
                                 placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                 toolTip={I18n.t("collaboration.organisationTooltip")}
                                 onChange={selectedOption => this.setState({organisation: selectedOption},
                                     () => {
                                         this.validateCollaborationName({target: {value: this.state.name}});
                                         this.validateCollaborationShortName({target: {value: this.state.short_name}});
                                     })}
                                 searchable={true}
                    />
                    {(!initial && isEmpty(organisation)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.organisation_name").toLowerCase()
                    })}</span>}

                    <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                                placeholder={I18n.t("collaboration.administratorsPlaceholder")}
                                name={I18n.t("collaboration.administrators")}
                                toolTip={I18n.t("collaboration.administratorsTooltip")}
                                onBlur={this.addEmail}
                                onEnter={this.addEmail}/>

                    <section className="email-tags">
                        {administrators.map(mail =>
                            <div key={mail} className="email-tag">
                                <span>{mail}</span>
                                {(disabled || mail === this.props.user.email) ?
                                    <span className="disabled"><FontAwesomeIcon icon="envelope"/></span> :
                                    <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>}
                            </div>)}
                    </section>

                    <InputField value={message} onChange={e => this.setState({message: e.target.value})}

                                placeholder={I18n.t("collaboration.messagePlaceholder")}
                                name={I18n.t("collaboration.message")}
                                toolTip={I18n.t("collaboration.messageTooltip")}
                                multiline={true}/>

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("forms.submit")} onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewCollaboration;