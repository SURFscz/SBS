import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {organisationById, organisationInvitations, organisationInvitationsPreview} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {validEmailRegExp} from "../validations/regExps";
import "./NewOrganisationInvitation.scss"
import DateField from "../components/DateField";
import {getParameterByName} from "../utils/QueryParameters";
import SelectField from "../components/SelectField";
import {organisationRoles} from "../forms/constants";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/redesign/SpinnerField";
import EmailField from "../components/EmailField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

class NewOrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];
        this.intendedRolesOptions = organisationRoles.map(role => ({
            value: role,
            label: I18n.t(`organisation.organisationRoles.${role}`)
        }));
        this.state = {
            organisation: undefined,
            administrators: administrators,
            fileName: null,
            email: "",
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            intended_role: "manager",
            message: "",
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/organisations/${this.props.match.params.organisation_id}`)),
            leavePage: true,
            activeTab: "invitation_form",
            htmlPreview: "",
            loading: true
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.organisation_id) {
            organisationById(params.organisation_id)
                .then(json => {
                    this.setState({organisation: json, loading: false});
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {
                                path: `/organisations/${json.id}`,
                                value: I18n.t("breadcrumb.organisation", {name: json.name})
                            },
                            {path: "/", value: I18n.t("breadcrumb.organisationInvite")}
                        ];
                    });
                });
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {administrators, fileEmails} = this.state;
        return !isEmpty(administrators) || !isEmpty(fileEmails);
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, organisation, expiry_date, fileEmails, intended_role} = this.state;
            this.setState({loading: true});
            organisationInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(() => {
                this.props.history.push(`/organisations/${organisation.id}/admins`);
                setFlash(I18n.t("organisationInvitation.flash.created", {name: organisation.name}))
            });
        } else {
            window.scrollTo(0, 0);
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
        const delimiters = [",", " ", ";", "\n", "\t"];
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

    tabChanged = activeTab => {
        this.setState({activeTab: activeTab});
        if (activeTab === "invitation_preview") {
            this.setState({loading: true});
            const {administrators, message, organisation, expiry_date, fileEmails, intended_role} = this.state;
            organisationInvitationsPreview({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(res => {
                const htmlPreview = res.html.replace(/class="button" href/g, "nope");
                this.setState({htmlPreview: htmlPreview, loading: false});
            });
        }
    };

    preview = disabledSubmit => (
        <div>
            <div className={"preview-mail"} dangerouslySetInnerHTML={{__html: this.state.htmlPreview}}/>
            {this.renderActions(disabledSubmit)}
        </div>
    );


    invitationForm = (organisation, message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date,
                      disabledSubmit, intended_role) =>
        <div className={"invitation-form"}>
            <EmailField value={email}
                        onChange={e => this.setState({email: e.target.value})}
                        addEmail={this.addEmail}
                        removeMail={this.removeMail}
                        name={I18n.t("invitation.invitees")}
                        error={!initial && isEmpty(administrators)}
                        emails={administrators}/>

            {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) && <ErrorIndicator
                msg={I18n.t("organisationInvitation.requiredAdministrator")}/>}

            <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                         options={this.intendedRolesOptions}
                         small={true}
                         name={I18n.t("invitation.intendedRoleOrganisation")}
                         toolTip={I18n.t("invitation.intendedRoleTooltipOrganisation")}
                         placeholder={I18n.t("collaboration.selectRole")}
                         onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>

            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("organisation.messagePlaceholder")}
                        name={I18n.t("organisation.message")}
                        toolTip={I18n.t("organisation.messageTooltip")}
                        large={true}
                        multiline={true}/>

            <DateField value={expiry_date}
                       onChange={e => this.setState({expiry_date: e})}
                       pastDatesAllowed={this.props.config.past_dates_allowed}
                       maxDate={moment().add(31, "day").toDate()}
                       name={I18n.t("organisationInvitation.expiryDate")}
                       toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

            {this.renderActions(disabledSubmit)}
        </div>;

    renderActions = disabledSubmit => (
        <section className="actions">
            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")}
                    onClick={this.submit}/>
        </section>
    );

    render() {
        const {
            email, initial, administrators, expiry_date, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName,
            fileTypeError, fileEmails, fileInputKey, intended_role, loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = (!initial && !this.isValid());
        return (
            <>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <UnitHeader obj={organisation}
                            name={organisation.name}/>
                <div className="mod-new-organisation-invitation">
                    <h2>{I18n.t("tabs.invitation_form")}</h2>
                    <div className="new-organisation-invitation">
                        {this.invitationForm(organisation, message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial,
                            administrators, expiry_date, disabledSubmit, intended_role)}
                    </div>
                </div>
            </>);
    }

}

export default NewOrganisationInvitation;