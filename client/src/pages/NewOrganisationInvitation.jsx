import React from "react";
import "./Home.scss";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {organisationById, organisationInvitations} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./NewOrganisation.scss";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";

import "./NewOrganisationInvitation.scss"
import DateField from "../components/DateField";

class NewOrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: undefined,
            administrators: [],
            email: "",
            message: "",
            expiry_date: moment().add(14, "days").toDate(),
            required: ["administrators"],
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/organisations/${this.props.match.params.organisation_id}`)),
            leavePage: true,
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.organisation_id) {
            organisationById(params.organisation_id)
                .then(json => this.setState({organisation: json}));
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
            const {administrators, message, organisation} = this.state;
            organisationInvitations({administrators, message, organisation_id: organisation.id}).then(res => {
                this.props.history.push(`/organisations/${organisation.id}`);
                setFlash(I18n.t("organisationInvitation.flash.created", {name: organisation.name}))
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
            email, initial, administrators, expiry_date, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message
        } = this.state;
        if (organisation === undefined) {
            return null;
        }
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-new-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>

                <div className="new-organisation-invitation">
                    <p className="title">{I18n.t("organisationInvitation.createTitle", {organisation: organisation.name})}</p>
                    <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                placeholder={I18n.t("organisation.messagePlaceholder")}
                                name={I18n.t("organisation.message")}
                                toolTip={I18n.t("organisation.messageTooltip")}
                                multiline={true}/>

                    <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                                placeholder={I18n.t("organisation.administratorsPlaceholder")}
                                name={I18n.t("organisation.administrators")}
                                toolTip={I18n.t("organisation.administratorsTooltip")}
                                onBlur={this.addEmail}
                                onEnter={this.addEmail}/>
                    {(!initial && isEmpty(administrators)) &&
                    <span
                        className="error">{I18n.t("organisationInvitation.requiredAdministrator")}</span>}
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
                               name={I18n.t("organisationInvitation.expiryDate")}
                               toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")} onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default NewOrganisationInvitation;