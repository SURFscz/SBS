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
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {validEmailRegExp} from "../validations/regExps";
import {ReactComponent as InviteIcon} from "../icons/single-neutral-question.svg";
import {ReactComponent as EyeIcon} from "../icons/eye-icon.svg";
import "./NewOrganisationInvitation.scss"
import DateField from "../components/DateField";
import {getParameterByName} from "../utils/QueryParameters";
import Tabs from "../components/Tabs";
import SelectField from "../components/SelectField";
import {organisationRoles} from "../forms/constants";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/redesign/SpinnerField";

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
            loading: true,
            submitted: false
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
                            {value: I18n.t("breadcrumb.organisations")},
                            {path: `/organisations/${json.id}`, value: json.name},
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
            const {administrators, message, organisation, expiry_date, fileEmails} = this.state;
            this.setState({submitted: true});
            organisationInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(res => {
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
    onFileRemoval = e => {
        stopEvent(e);
        this.setState({
            fileName: null, fileEmails: [], fileTypeError: false,
            fileInputKey: new Date().getMilliseconds()
        });
    };

    onFileUpload = e => {
        const files = e.target.files;
        if (!isEmpty(files)) {
            const file = files[0];
            if (file.name.endsWith("csv")) {
                const reader = new FileReader();
                reader.onload = () => {
                    const csvEmails = reader.result;
                    const fileEmails = csvEmails.split(/[,\n\r]/)
                        .map(s => s.trim().replace(/[\t\r\n]/g, ""))
                        .filter(mail => validEmailRegExp.test(mail));
                    this.setState({
                        fileName: file.name,
                        fileTypeError: false,
                        fileEmails: fileEmails
                    });
                };
                reader.readAsText(file);
            } else {
                this.setState({fileName: file.name, fileTypeError: true, fileEmails: []});
            }
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
            }).then(res => this.setState({
                htmlPreview: res.html.replace(/class="link" href/g, "nope"),
                loading: false
            }));
        }
    };

    preview = disabledSubmit => (
        <div>
            <div className={"preview-mail"} dangerouslySetInnerHTML={{__html: this.state.htmlPreview}}/>
            {this.renderActions(disabledSubmit, false)}
        </div>
    );


    invitationForm = (organisation, message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date,
                      disabledSubmit, intended_role) =>
        <div className={"invitation-form"}>
            <InputField value={email}
                        onChange={e => this.setState({email: e.target.value})}
                        placeholder={I18n.t("organisation.administratorsPlaceholder")}
                        name={I18n.t("organisation.administrators")}
                        toolTip={I18n.t("organisation.administratorsTooltip")}
                        onBlur={this.addEmail}
                        onEnter={this.addEmail}
                        fileUpload={false}
                        fileInputKey={fileInputKey}
                        fileName={fileName}
                        multiline={true}
                        onFileRemoval={this.onFileRemoval}
                        onFileUpload={this.onFileUpload}/>
            {fileTypeError &&
            <span
                className="error">{I18n.t("organisationInvitation.fileExtensionError")}</span>}

            {(fileName && !fileTypeError) &&
            <span className="info-msg">{I18n.t("organisationInvitation.fileImportResult", {
                nbr: fileEmails.length,
                fileName: fileName
            })}</span>}

            {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) &&
            <span
                className="error">{I18n.t("organisationInvitation.requiredAdministrator")}</span>}

            <section className="email-tags">
                {administrators.map(mail =>
                    <div key={mail} className="email-tag">
                        <span>{mail}</span>
                        <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>
                    </div>)}
            </section>

            <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                         options={this.intendedRolesOptions}
                         name={I18n.t("invitation.intendedRoleOrganisation")}
                         toolTip={I18n.t("invitation.intendedRoleTooltipOrganisation")}
                         placeholder={I18n.t("collaboration.selectRole")}
                         onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>
            {(!initial && isEmpty(intended_role)) &&
            <span
                className="error">{I18n.t("invitation.requiredRole")}</span>}

            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("organisation.messagePlaceholder")}
                        name={I18n.t("organisation.message")}
                        toolTip={I18n.t("organisation.messageTooltip")}
                        large={true}
                        multiline={true}/>

            <DateField value={expiry_date}
                       onChange={e => this.setState({expiry_date: e})}
                       maxDate={moment().add(31, "day").toDate()}
                       name={I18n.t("organisationInvitation.expiryDate")}
                       toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

            {this.renderActions(disabledSubmit, true)}
        </div>;

    renderActions = (disabledSubmit, showPreview) => (
        <section className="actions">
            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            {showPreview && <Button cancelButton={true} className="preview" txt={I18n.t("organisationDetail.preview")}
                                    onClick={() => this.tabChanged("invitation_preview")}/>}
            {!showPreview && <Button cancelButton={true} className="preview" txt={I18n.t("organisationDetail.details")}
                                     onClick={() => this.tabChanged("invitation_form")}/>}
            <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")}
                    onClick={this.submit}/>
        </section>
    );

    render() {
        const {
            email, initial, administrators, expiry_date, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName,
            fileTypeError, fileEmails, fileInputKey, activeTab, intended_role, loading, submitted
        } = this.state;
        if (loading || submitted) {
            return <SpinnerField/>
        }
        const disabledSubmit = (!initial && !this.isValid());
        return (
            <div className="mod-new-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <UnitHeader obj={organisation}
                            name={organisation.name}/>

                <Tabs activeTab={activeTab} tabChanged={this.tabChanged}>
                    <div label={I18n.t("tabs.invitation_form")} key={"tabs.invitation_form"}
                         name={"invitation_form"} icon={<InviteIcon/>}>
                        <div className="new-organisation-invitation">
                            {this.invitationForm(organisation, message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial,
                                administrators, expiry_date, disabledSubmit, intended_role)}
                        </div>
                    </div>
                    <div label={I18n.t("tabs.invitation_preview")} key={"invitation_preview"}
                         name={"invitation_preview"} icon={<EyeIcon/>}>
                        <div className="new-organisation-invitation">
                            {this.preview(disabledSubmit)}
                        </div>
                    </div>
                </Tabs>

            </div>);
    };

}

export default NewOrganisationInvitation;