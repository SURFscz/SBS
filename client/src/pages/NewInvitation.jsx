import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationById, collaborationInvitations, collaborationInvitationsPreview} from "../api";
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
import {getParameterByName} from "../utils/QueryParameters";

class NewInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.intendedRolesOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`collaboration.${role}`)
        }));
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];

        this.state = {
            collaboration: undefined,
            administrators: administrators,
            fileName: null,
            email: "",
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            intended_role: "member",
            message: "",
            expiry_date: moment().add(14, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/collaborations/${this.props.match.params.collaboration_id}`)),
            leavePage: true,
            tabs: ["form", "preview"],
            activeTab: "form",
            htmlPreview: ""

        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            collaborationById(params.collaboration_id)
                .then(json =>
                    this.setState({
                        collaboration: json,
                        intended_role: json.collaboration_memberships.some(m => m.role === "admin") ? "member" : "admin"
                    })
                );
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {administrators, fileEmails, intended_role} = this.state;
        return (!isEmpty(administrators) || !isEmpty(fileEmails)) && !isEmpty(intended_role);
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, collaboration, expiry_date, fileEmails, intended_role} = this.state;
            collaborationInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role: intended_role,
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
        return true;
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

    tabChanged = () => {
        if (this.state.activeTab === "preview") {
            const {administrators, message, collaboration, intended_role, expiry_date, fileEmails} = this.state;
            collaborationInvitationsPreview({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role: intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                collaboration_id: collaboration.id
            }).then(res => this.setState({htmlPreview: res.html.replace(/class="link" href/g, "nope")}));
        }
    };

    preview = () => <div dangerouslySetInnerHTML={{__html: this.state.htmlPreview}}/>;

    invitationForm = (email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, intended_role, message, expiry_date, disabledSubmit) =>
        <>
            <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                        placeholder={I18n.t("invitation.inviteesPlaceholder")}
                        name={I18n.t("invitation.invitees")}
                        toolTip={I18n.t("invitation.inviteesMessagesTooltip")}
                        onBlur={this.addEmail}
                        onEnter={this.addEmail}
                        fileInputKey={fileInputKey}
                        fileUpload={true}
                        fileName={fileName}
                        onFileRemoval={this.onFileRemoval}
                        onFileUpload={this.onFileUpload}/>
            {fileTypeError &&
            <span
                className="error">{I18n.t("invitation.fileExtensionError")}</span>}

            {(fileName && !fileTypeError) &&
            <span className="info-msg">{I18n.t("invitation.fileImportResult", {
                nbr: fileEmails.length,
                fileName: fileName
            })}</span>}

            {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) &&
            <span
                className="error">{I18n.t("invitation.requiredEmail")}</span>}

            <section className="email-tags">
                {administrators.map(mail =>
                    <div key={mail} className="email-tag">
                        <span>{mail}</span>
                        <span onClick={this.removeMail(mail)}><FontAwesomeIcon icon="times"/></span>
                    </div>)}
            </section>

            <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                         options={this.intendedRolesOptions}
                         name={I18n.t("invitation.intendedRole")}
                         toolTip={I18n.t("invitation.intendedRoleTooltip")}
                         placeholder={I18n.t("collaboration.selectRole")}
                         onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>
            {(!initial && isEmpty(intended_role)) &&
            <span
                className="error">{I18n.t("invitation.requiredRole")}</span>}

            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("invitation.inviteesMessagePlaceholder")}
                        name={I18n.t("collaboration.message")}
                        toolTip={I18n.t("invitation.inviteesTooltip")}
                        multiline={true}/>

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
        </>;


    render() {
        const {
            email, initial, administrators, expiry_date, collaboration, intended_role,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName, fileInputKey,
            fileTypeError, fileEmails, tabs, activeTab
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
                <div className="tabs">
                    {tabs.map(tab => {
                        const className = tab === activeTab ? "tab active" : "tab";

                        return (
                            <div className={className} key={tab}
                                 onClick={() => this.setState({activeTab: tab}, this.tabChanged)}>
                                <h2>{I18n.t(`organisationDetail.tabs.${tab}`)}</h2>
                            </div>
                        );
                    })}
                </div>

                {activeTab === "form" && <div className="new-collaboration-invitation">
                    {this.invitationForm(email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, intended_role, message, expiry_date, disabledSubmit)}
                </div>}
                {activeTab === "preview" && <div className="new-collaboration-invitation">
                    {this.preview()}
                </div>}

            </div>);
    };


}

export default NewInvitation;