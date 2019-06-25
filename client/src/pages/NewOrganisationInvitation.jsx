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

import "./NewOrganisationInvitation.scss"
import DateField from "../components/DateField";
import {getParameterByName} from "../utils/QueryParameters";

class NewOrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];

        this.state = {
            organisation: undefined,
            administrators: administrators,
            fileName: null,
            email: "",
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            message: "",
            expiry_date: moment().add(14, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/organisations/${this.props.match.params.organisation_id}`)),
            leavePage: true,
            tabs: ["form", "preview"],
            activeTab: "form",
            htmlPreview: ""
        };
    }

    componentDidMount = () => {
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
        const {administrators, fileEmails} = this.state;
        return !isEmpty(administrators) || !isEmpty(fileEmails);
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, organisation, expiry_date, fileEmails} = this.state;
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

    tabChanged = () => {
        if (this.state.activeTab === "preview") {
            const {administrators, message, organisation, expiry_date, fileEmails} = this.state;
            organisationInvitationsPreview({
                administrators: administrators.concat(fileEmails),
                message,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(res => this.setState({htmlPreview: res.html.replace(/href/g, "nope")}));
        }
    };

    preview = () => <div dangerouslySetInnerHTML={{__html: this.state.htmlPreview}}/>;


    invitationForm = (message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date, disabledSubmit) =>
        <>
            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("organisation.messagePlaceholder")}
                        name={I18n.t("organisation.message")}
                        toolTip={I18n.t("organisation.messageTooltip")}
                        multiline={true}/>

            <InputField value={email}
                        onChange={e => this.setState({email: e.target.value})}
                        placeholder={I18n.t("organisation.administratorsPlaceholder")}
                        name={I18n.t("organisation.administrators")}
                        toolTip={I18n.t("organisation.administratorsTooltip")}
                        onBlur={this.addEmail}
                        onEnter={this.addEmail}
                        fileUpload={true}
                        fileInputKey={fileInputKey}
                        fileName={fileName}
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

            <DateField value={expiry_date}
                       onChange={e => this.setState({expiry_date: e})}
                       maxDate={moment().add(1, "month").toDate()}
                       name={I18n.t("organisationInvitation.expiryDate")}
                       toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

            <section className="actions">
                <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")}
                        onClick={this.submit}/>
                <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            </section>
        </>;

    render() {
        const {
            email, initial, administrators, expiry_date, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName,
            fileTypeError, fileEmails, fileInputKey, tabs, activeTab
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
                <div className="title">
                    <a href={`/organisations${organisation.id}`} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/organisations/${organisation.id}`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("organisationDetail.backToOrganisationDetail", {name: organisation.name})}
                    </a>
                    <p className="title">{I18n.t("organisationInvitation.createTitle", {organisation: organisation.name})}</p>
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
                {activeTab === "form" && <div className="new-organisation-invitation">
                    {this.invitationForm(message, email, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date, disabledSubmit)}
                </div>}
                {activeTab === "preview" && <div className="new-organisation-invitation">
                    {this.preview()}
                </div>}
            </div>);
    };

}

export default NewOrganisationInvitation;