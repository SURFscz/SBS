import React from "react";
import "./Home.scss";
import {
    invitationAccept,
    invitationByHash,
    invitationById,
    invitationDecline
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Invite.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";

class Invite extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {user: {}, collaboration: {collaboration_memberships: []},},
            acceptedTerms: false,
            initial: true,
            readOnly: true,
            confirmationDialogOpen: false,
            leavePage: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            invitationByHash(params.hash)
                .then(json => {
                    this.setState({invite: json, readOnly: false});
                });
        } else if (params.id) {
            invitationById(params.id)
                .then(json => {
                    this.setState({invite: json});
                });
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoCollaborations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/collaborations/${this.state.invite.collaboration.id}`));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: true,
            cancelDialogAction: this.gotoCollaborations, confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog, confirmationDialogAction: this.doDecline
        });
    };

    doDecline = () => {
        const {invite} = this.state;
        invitationDecline(invite).then(res => {
            this.props.history.push("/collaborations");
            setFlash(I18n.t("invitation.flash.inviteDeclined", {name: invite.collaboration.name}));
        });
    };

    isValid = () => {
        const {acceptedTerms, readOnly} = this.state;
        return acceptedTerms || readOnly;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {invite} = this.state;
            invitationAccept(invite).then(res => {
                this.gotoCollaborations();
                setFlash(I18n.t("invitation.flash.inviteAccepted", {name: invite.collaboration.name}));
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
            invite, acceptedTerms, initial, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, readOnly, leavePage
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("invitation.declineInvitation")}/>

                <div className="invitation">
                    <p className="title">{I18n.t("invitation.title", {collaboration: invite.collaboration.name})}</p>
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

                    <InputField value={invite.message}
                                name={I18n.t("invitation.message")}
                                toolTip={I18n.t("invitation.messageTooltip", {name: invite.user.name})}
                                disabled={true}
                                multiline={true}/>

                    {!readOnly &&
                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: invite.collaboration.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: invite.collaboration.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>}

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("invitation.accept")}
                                onClick={this.accept}/>
                        <Button cancelButton={true} txt={I18n.t("invitation.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default Invite;