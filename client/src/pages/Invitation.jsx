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
import moment from "moment";
import DateField from "../components/DateField";
import SelectField from "../components/SelectField";
import BackLink from "../components/BackLink";
import {userRole} from "../utils/UserRole";

class Invitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {user: {}, collaboration: {collaboration_memberships: []},},
            acceptedTerms: false,
            personalDataConfirmation: false,
            initial: true,
            confirmationDialogOpen: false,
            confirmationQuestion: "",
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            leavePage: false,
            isAdminLink: false,
            isExpired: false,
            errorOccurred: false,
            intentToDeny: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const today = moment();
        if (params.hash) {
            invitationByHash(params.hash)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    const intentToDeny = this.props.match.params.action === "deny";
                    this.setState({invite: json, isExpired, intentToDeny: intentToDeny});
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
        () => {
            const {invite, isAdminLink} = this.state;
            const {user} = this.props;
            const member = (user.collaboration_memberships || []).find(membership => membership.collaboration_id === invite.collaboration.id);
            if (member || isAdminLink) {
                this.props.history.push(`/collaborations/${invite.collaboration.id}`);
            } else {
                this.props.history.push(`/home`);
            }
        });

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
        invitationDecline(invite).then(() => {
            this.setState({confirmationDialogOpen: false});
            setFlash(I18n.t("invitation.flash.inviteDeclined", {name: invite.collaboration.name}));
            this.props.history.push(`/home`);
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
        const {acceptedTerms, personalDataConfirmation, isAdminLink, invite} = this.state;
        const aup = invite.collaboration.accepted_user_policy;
        return ((acceptedTerms || !aup) && personalDataConfirmation) || isAdminLink;
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
                                    setFlash(I18n.t("invitation.flash.alreadyMember"), "error"));
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
            confirmationDialogAction, leavePage, isAdminLink, isExpired, errorOccurred, personalDataConfirmation,
            intentToDeny
        } = this.state;
        const {user} = this.props;
        const disabledSubmit = !initial && !this.isValid();
        const errorSituation = errorOccurred || !invite.id;
        const expiredMessage = isAdminLink ? I18n.t("invitation.expiredAdmin", {expiry_date: moment(invite.expiry_date * 1000).format("LL")}) :
            I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});

        const aup = invite.collaboration.accepted_user_policy;
        const acceptButton = <Button cancelButton={intentToDeny} disabled={disabledSubmit}
                                     txt={I18n.t("invitation.accept")}
                                     onClick={this.accept}/>;
        const declineButton = <Button cancelButton={!intentToDeny} txt={I18n.t("invitation.decline")}
                                      onClick={this.decline}/>;
        return (
            <div className="mod-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={confirmationQuestion}/>
                {isAdminLink && <BackLink history={this.props.history} fullAccess={true} role={userRole(user,
                    {
                        organisation_id: invite.collaboration.organisation_id,
                        collaboration_id: invite.collaboration_id,
                    })}/>}
                {!errorSituation &&
                <p className="title">{I18n.t("invitation.title", {collaboration: invite.collaboration.name})}</p>}

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

                    <SelectField
                        value={(invite.groups || []).map(ag => ({value: ag.id, label: ag.name}))}
                        options={[]}
                        name={I18n.t("invitation.groups")}
                        isMulti={true}
                        disabled={true}
                    />

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
                    <section className={`form-element ${(acceptedTerms && personalDataConfirmation) ? "" : "invalid"}`}>
                        <CheckBox name="personalDataConfirmation"
                                  className={`checkbox ${!initial && !personalDataConfirmation ? "required" : ""}`}
                                  value={personalDataConfirmation}
                                  info={I18n.t("registration.step2.personalDataConfirmation", {name: invite.collaboration.name})}
                                  onChange={e => this.setState({personalDataConfirmation: e.target.checked})}/>
                        {!aup && <label className="form-label policy">
                            {I18n.t("registration.step2.noAup", {name: invite.collaboration.name})}</label>}
                        {aup &&
                        <CheckBox name="policy"
                                  className={`checkbox ${!initial && !acceptedTerms ? "required" : ""}`}
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation",
                                      {
                                          collaboration: invite.collaboration.name,
                                          aup: aup
                                      })}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>}
                    </section>}
                    {(!isAdminLink && !isExpired && !errorSituation) &&
                    <section className="actions">
                        {intentToDeny && <>{declineButton}{acceptButton}</>}
                        {!intentToDeny && <>{acceptButton}{declineButton}</>}
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
