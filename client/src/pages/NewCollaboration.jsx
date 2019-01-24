import React from "react";
import "./NewCollaboration.scss";
import {collaborationNameExists, createCollaboration, myOrganisationsLite} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";
import {collaborationAccessTypes} from "../models/constants";
import SelectField from "../components/SelectField";

class NewCollaboration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.accessTypeOptions = collaborationAccessTypes.map(type => ({
            value: type,
            label: I18n.t(`accessTypes.${type}`)
        }));
        this.state = {
            name: "",
            description: "",
            access_type: this.accessTypeOptions[0].value,
            administrators: [this.props.user.email],
            message: "",
            email: "",
            accepted_user_policy: "",
            enrollment: "",
            status: "",
            required: ["name", "organisation"],
            alreadyExists: {},
            organisation: undefined,
            organisations: [],
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations")),
            leavePage: true,
        };
    }

    componentWillMount = () => {
        myOrganisationsLite().then(json => {
            if (json.length === 0) {
                this.props.history.push("/404");
            } else {
                this.setState({organisations: json.map(org => ({label: org.name, value: org.id}))});
            }
        });
    };
    validateCollaborationName = e =>
        collaborationNameExists(e.target.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
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
                name, description, access_type, enrollment,
                administrators, message, accepted_user_policy, organisation
            } = this.state;
            createCollaboration({
                name, description, enrollment, access_type,
                administrators, message, accepted_user_policy, organisation_id: organisation.value
            }).then(res => {
                this.props.history.push("/collaborations");
                setFlash(I18n.t("collaboration.flash.created", {name: res.name}))
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
            name, description, access_type, administrators, message, accepted_user_policy, enrollment,organisation, organisations, email, initial, alreadyExists,
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
                        value: name
                    })}</span>}
                    {(!initial && isEmpty(name)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.name").toLowerCase()
                    })}</span>}

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                                name={I18n.t("collaboration.description")}/>

                    <InputField value={accepted_user_policy}
                                onChange={e => this.setState({accepted_user_policy: e.target.value})}
                                placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                name={I18n.t("collaboration.accepted_user_policy")}/>

                    <InputField value={enrollment}
                                onChange={e => this.setState({enrollment: e.target.value})}
                                placeholder={I18n.t("collaboration.enrollmentPlaceholder")}
                                toolTip={I18n.t("collaboration.enrollmentTooltip")}
                                name={I18n.t("collaboration.enrollment")}/>

                    <SelectField value={this.accessTypeOptions.find(option => option.value === access_type)}
                                 options={this.accessTypeOptions}
                                 name={I18n.t("collaboration.access_type")}
                                 placeholder={I18n.t("collaboration.accessTypePlaceholder")}
                                 onChange={selectedOption => this.setState({access_type: selectedOption ? selectedOption.value : null})}
                    />

                    <SelectField value={organisation}
                                 options={organisations}
                                 name={I18n.t("collaboration.organisation_name")}
                                 placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                 toolTip={I18n.t("collaboration.organisationTooltip")}
                                 onChange={selectedOption => this.setState({organisation: selectedOption})}
                    />
                    {(!initial && isEmpty(organisation)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.organisation_name").toLowerCase()
                    })}</span>}

                    <InputField value={message} onChange={e => this.setState({message: e.target.value})}

                                placeholder={I18n.t("collaboration.messagePlaceholder")}
                                name={I18n.t("collaboration.message")}
                                toolTip={I18n.t("collaboration.messageTooltip")}
                                multiline={true}/>

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
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("forms.submit")} onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewCollaboration;