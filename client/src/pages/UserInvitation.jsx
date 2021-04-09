import React from "react";
import {
    invitationAccept,
    invitationByHash,
    invitationDecline,
    organisationInvitationAccept,
    organisationInvitationByHash,
    organisationInvitationDecline
} from "../api";
import I18n from "i18n-js";
import "./UserInvitation.scss";
import Button from "../components/Button";
import {setFlash} from "../utils/Flash";
import moment from "moment";
import {login} from "../utils/Login";
import ConfirmationDialog from "../components/ConfirmationDialog";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import {isEmpty} from "../utils/Utils";

class UserInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {
                user: {},
                collaboration: {collaboration_memberships: []},
                organisation: {organisation_memberships: []}
            },
            personalDataConfirmation: false,
            initial: true,
            isExpired: false,
            errorOccurred: false,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: "",
            confirmationDialogAction: () => true,
            cancelDialogAction: this.closeConfirmationDialog,
            loading: false,
            skippedLoginStep: false
        };
    }

    componentDidMount = () => {
        const {params} = this.props.match;
        const today = moment();
        if (params.hash) {
            const {isOrganisationInvite} = this.props;
            const promise = isOrganisationInvite ? organisationInvitationByHash(params.hash) : invitationByHash(params.hash);
            promise.then(json => {
                const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                const {user} = this.props;
                let skippedLoginStep = false;
                if (user.guest) {
                    //We need to store that we skip step 1
                    window.localStorage.setItem("step1", "true");
                } else {
                    const step1 = window.localStorage.getItem("step1");
                    skippedLoginStep = isEmpty(step1);
                    window.localStorage.removeItem("step1");
                }
                this.setState({invite: json, isExpired: isExpired, loading: true, skippedLoginStep: skippedLoginStep});
            }).catch(() => {
                this.props.history.push("/404");
            });
        } else {
            this.props.history.push("/404");
        }
    };

    accept = () => {
        const {invite} = this.state;
        const {isOrganisationInvite} = this.props;
        const promise = isOrganisationInvite ? organisationInvitationAccept(invite) : invitationAccept(invite);
        promise.then(() => {
            this.props.refreshUser(() => {
                this.props.history.push(`/${isOrganisationInvite ? "organisations" : "collaborations"}/${isOrganisationInvite ? invite.organisation_id : invite.collaboration_id}?first=true`);
            });
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
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancel = () => this.confirm(
        () => this.props.history.push("/dead-end"),
        I18n.t("models.invitation.confirmations.cancelInvitation"));

    decline = () => this.confirm(
        this.doDecline,
        I18n.t("models.invitation.confirmations.declineInvitation"));

    doDecline = () => {
        const {invite} = this.state;
        const {isOrganisationInvite} = this.props;
        const promise = isOrganisationInvite ? organisationInvitationDecline(invite) : invitationDecline(invite);
        promise.then(() => {
            this.setState({confirmationDialogOpen: false});
            setFlash(I18n.t("invitation.flash.inviteDeclined", {name: isOrganisationInvite ? invite.organisation.name : invite.collaboration.name}));
            this.props.history.push(`/home`);
        });
    };

    renderAcceptInvitationStep = (isOrganisationInvite, invite, skippedLoginStep) => {
        const hasAup = !isOrganisationInvite && invite.collaboration.accepted_user_policy;
        const circleClassName = skippedLoginStep ? "circle two-quarters" : "circle two-third"
        const stepNow = skippedLoginStep ? "1" : "2";
        const stepTotal = skippedLoginStep ? "2" : "3";
        return (
            <section className="step-container">
                <div className="step">
                    <div className={circleClassName}>
                        <span>{I18n.t("models.invitation.steps.progress", {now: stepNow, total: stepTotal})}</span>
                    </div>
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.invite")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: I18n.t("models.invitation.steps.collaborate")})}</span>
                    </div>
                </div>
                {!isOrganisationInvite && <div className="disclaimer">
                    <p>{I18n.t("models.invitation.disclaimer")}</p>
                    {hasAup && <p dangerouslySetInnerHTML={{__html: I18n.t("models.invitation.disclaimerAup", {aup: invite.collaboration.accepted_user_policy})}}/>}
                    <p>{I18n.t("models.invitation.disclaimerQuestions")}</p>
                </div>}
                <Button onClick={this.accept}
                        txt={<span>{I18n.t("models.invitation.acceptInvitation")}</span>}/>
                <Button onClick={this.decline} cancelButton={true}
                        txt={<span>{I18n.t("models.invitation.declineInvitation")}</span>}/>
            </section>
        )
    }

    renderLoginStep = () => {
        return (
            <section className="step-container">
                <div className="step">
                    <div className="circle one-third">
                        <span>{I18n.t("models.invitation.steps.progress", {now: "1", total: "3"})}</span>
                    </div>
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.login")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: I18n.t("models.invitation.steps.invite")})}</span>
                    </div>
                </div>
                <Button onClick={login} html={I18n.t("models.invitation.loginWithSub")} txt="login"/>
                <p className="tip"><sup>*</sup>{I18n.t("models.invitation.loginTip")}</p>
            </section>
        )
    }

    render() {
        const {user, isOrganisationInvite} = this.props;
        const { invite, isExpired, errorOccurred, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogQuestion, confirmationDialogAction, skippedLoginStep } = this.state;
        const expiredMessage = I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});
        return (
            <div className="mod-user-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                {!errorOccurred &&
                <div className="invitation-container">
                    {!isExpired && <h1>Hi,</h1>}
                    {isExpired &&
                    <p className="expired"><ErrorIndicator msg={expiredMessage}/></p>}
                    {!isExpired && <div className="invitation-inner">
                        <p className="info">{I18n.t("models.invitation.welcome")}</p>
                        <section className="invitation">
                            <span dangerouslySetInnerHTML={{__html: I18n.t("models.invitation.invited", {
                                type: isOrganisationInvite ? I18n.t("welcomeDialog.organisation") : I18n.t("welcomeDialog.collaboration"),
                                collaboration: isOrganisationInvite ? invite.organisation.name : invite.collaboration.name,
                                inviter: invite.user.name,
                                email: invite.user.email
                            })}}/>
                        </section>
                        <p className="info">{I18n.t("models.invitation.followingSteps")}</p>
                        {user.guest && this.renderLoginStep()}
                        {!user.guest && this.renderAcceptInvitationStep(isOrganisationInvite, invite, skippedLoginStep)}
                    </div>}

                </div>}
            </div>);
    };
}

export default UserInvitation;
