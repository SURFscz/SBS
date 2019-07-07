import React from "react";
import {
    invitationAccept,
    invitationByHash,
    invitationById,
    invitationDecline,
    invitationDelete,
    invitationResend
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Invitation.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";
import DateField from "../components/DateField";

class Invitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {user: {}, collaboration: {collaboration_memberships: []},},
            acceptedTerms: false,
            initial: true,
            confirmationDialogOpen: false,
            confirmationQuestion: "",
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            leavePage: false,
            isAdminLink: false,
            isExpired: false,
            errorOccurred: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const today = moment();
        if (params.hash) {
            invitationByHash(params.hash)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    this.setState({invite: json, isExpired});
                })
                .catch(() =>
                    setFlash(I18n.t("organisationInvitation.flash.notFound"), "error"));
        } else if (params.id) {
            invitationById(params.id)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    this.setState({invite: json, isAdminLink: true, isExpired});
                })
                .catch(() =>
                    setFlash(I18n.t("organisationInvitation.flash.notFound"), "error"));

        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoCollaborations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/collaborations/${this.state.invite.collaboration.id}`));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoCollaborations,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDecline,
            confirmationQuestion: I18n.t("invitation.declineInvitation")
        });
    };

    doDecline = () => {
        const {invite} = this.state;
        invitationDecline(invite).then(res => {
            this.gotoCollaborations();
            setFlash(I18n.t("invitation.flash.inviteDeclined", {name: invite.collaboration.name}));
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationQuestion: I18n.t("invitation.deleteInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {invite} = this.state;
        invitationDelete(invite.id).then(res => {
            this.gotoCollaborations();
            setFlash(I18n.t("invitation.flash.inviteDeleted", {name: invite.collaboration.name}));
        });
    };

    resend = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationQuestion: I18n.t("invitation.resendInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doResend
        });
    };

    doResend = () => {
        const {invite} = this.state;
        invitationResend(invite).then(res => {
            this.gotoCollaborations();
            setFlash(I18n.t("invitation.flash.inviteResend", {name: invite.collaboration.name}));
        });
    };


    isValid = () => {
        const {acceptedTerms, isAdminLink} = this.state;
        return acceptedTerms || isAdminLink;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {invite} = this.state;
            invitationAccept(invite)
                .then(res => {
                    this.props.history.push("/home");
                    setFlash(I18n.t("invitation.flash.inviteAccepted", {name: invite.collaboration.name}));
                    this.props.refreshUser();
                })
                .catch(e => {
                    if (e.response && e.response.json) {
                        e.response.json().then(res => {
                            if (res.message && res.message.indexOf("already a member") > -1) {
                                this.setState({errorOccurred: true}, () =>
                                    setFlash(I18n.t("organisationInvitation.flash.alreadyMember"), "error"));
                            }
                        });
                    } else {
                        throw e;
                    }
                });

        }
    };

    accept = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    requiredMarker = () => <sup className="required-marker">*</sup>;

    administrators = invite => invite.collaboration.collaboration_memberships
        .filter(m => m.role === "admin")
        .map(m => `${m.user.name} <${m.user.email}>`)
        .join(", ");

    render() {
        const {
            invite, acceptedTerms, initial, confirmationDialogOpen, cancelDialogAction, confirmationQuestion,
            confirmationDialogAction, leavePage, isAdminLink, isExpired, errorOccurred
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const errorSituation = errorOccurred || !invite.id;
        const expiredMessage = isAdminLink ? I18n.t("invitation.expiredAdmin", {expiry_date: moment(invite.expiry_date * 1000).format("LL")}) :
            I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});
        return (
            <div className="mod-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={confirmationQuestion}/>
                <div className="title">
                    {isAdminLink && <a href="/collaborations" onClick={e => {
                        stopEvent(e);
                        this.gotoCollaborations();
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("collaborationDetail.backToCollaborationDetail", {name: invite.collaboration.name})}
                    </a>}
                    {!errorSituation &&
                    <p className="title">{I18n.t("invitation.title", {collaboration: invite.collaboration.name})}</p>}
                </div>

                <div className="invitation">
                    {isExpired &&
                    <p className="error">{expiredMessage}</p>}
                    <InputField value={invite.collaboration.name}
                                name={I18n.t("invitation.collaborationName")}
                                disabled={true}/>

                    <InputField value={invite.collaboration.description}
                                name={I18n.t("invitation.collaborationDescription")}
                                disabled={true}/>

                    <InputField value={this.administrators(invite)}
                                name={I18n.t("invitation.collaborationAdministrators")}
                                disabled={true}/>

                    <InputField value={invite.user.name}
                                name={I18n.t("invitation.inviter")}
                                disabled={true}/>

                    {isAdminLink && <InputField value={invite.invitee_email}
                                                name={I18n.t("invitation.invitee_email")}
                                                disabled={true}/>}

                    <DateField value={moment(invite.expiry_date * 1000).toDate()}
                               name={I18n.t("invitation.expiryDate")}
                               toolTip={I18n.t("invitation.expiryDateTooltip")}
                               disabled={true}/>

                    <InputField value={invite.message}
                                name={I18n.t("invitation.message")}
                                toolTip={I18n.t("invitation.messageTooltip", {name: invite.user.name})}
                                disabled={true}
                                multiline={true}/>

                    {(!isAdminLink && !isExpired && !errorSituation) &&
                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: invite.collaboration.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  className={`checkbox ${!initial && !acceptedTerms ? "required" : ""}`}
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: invite.collaboration.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>}
                    {(!isAdminLink && !isExpired && !errorSituation) &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("invitation.accept")}
                                onClick={this.accept}/>
                        <Button cancelButton={true} txt={I18n.t("invitation.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}
                    {isAdminLink &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("invitation.resend")}
                                onClick={this.resend}/>
                        <Button className="delete" txt={I18n.t("invitation.delete")}
                                onClick={this.delete}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}

                </div>
            </div>);
    };
}

export default Invitation;