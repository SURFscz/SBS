import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationById, collaborationInvitations} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";

import "./NewInvitation.scss"
import DateField from "../components/DateField";
import {collaborationRoles} from "../forms/constants";
import SelectField from "../components/SelectField";

class NewInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.intendedRolesOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`collaboration.${role}`)
        }));
        this.state = {
            collaboration: undefined,
            administrators: [],
            email: "",
            intended_role: "member",
            message: "",
            expiry_date: moment().add(14, "days").toDate(),
            required: ["administrators"],
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/collaborations/${this.props.match.params.collaboration_id}`)),
            leavePage: true,
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            collaborationById(params.collaboration_id)
                .then(json => this.setState({collaboration: json}));
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {required} = this.state;
        const inValid = required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, collaboration, expiry_date} = this.state;
            collaborationInvitations({
                administrators,
                message,
                collaboration_id: collaboration.id,
                expiry_date: expiry_date.getTime() / 1000
            }).then(res => {
                this.props.history.push(`/collaborations/${collaboration.id}`);
                setFlash(I18n.t("invitation.flash.created", {name: collaboration.name}))
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
            email, initial, administrators, expiry_date, collaboration, intended_role,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message
        } = this.state;
        if (collaboration === undefined) {
            return null;
        }
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-new-collaboration-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <div className="title">
                    <a href={`/collaborations/${collaboration.id}`} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/collaborations/${collaboration.id}`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("collaborationDetail.backToCollaborationDetail", {name: collaboration.name})}
                    </a>
                    <p className="title">{I18n.t("invitation.createTitle", {collaboration: collaboration.name})}</p>
                </div>
                <div className="new-collaboration-invitation">
                    <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                                 options={this.intendedRolesOptions}
                                 name={I18n.t("invitation.intendedRole")}
                                 toolTip={I18n.t("invitation.intendedRoleTooltip")}
                                 onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>

                    <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                placeholder={I18n.t("invitation.inviteesMessagePlaceholder")}
                                name={I18n.t("collaboration.message")}
                                toolTip={I18n.t("invitation.inviteesTooltip")}
                                multiline={true}/>

                    <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                                placeholder={I18n.t("invitation.inviteesPlaceholder")}
                                name={I18n.t("invitation.invitees")}
                                toolTip={I18n.t("invitation.inviteesMessagesTooltip")}
                                onBlur={this.addEmail}
                                onEnter={this.addEmail}/>
                    {(!initial && isEmpty(administrators)) &&
                    <span
                        className="error">{I18n.t("invitation.requiredEmail")}</span>}
                    <section className="email-tags">
                        {administrators.map(mail =>
                            <div key={mail} className="email-tag">
                                <span>{mail}</span>
                                <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>
                            </div>)}
                    </section>

                    <DateField value={expiry_date}
                               onChange={e => this.setState({expiry_date: e})}
                               maxDate={moment().add(1, "month").toDate()}
                               name={I18n.t("invitation.expiryDate")}
                               toolTip={I18n.t("invitation.expiryDateTooltip")}/>

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("invitation.invite")}
                                onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewInvitation;