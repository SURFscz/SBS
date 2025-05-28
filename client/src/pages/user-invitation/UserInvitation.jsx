import React from "react";
import {invitationByHash, organisationInvitationByHash} from "../../api";
import I18n from "../../locale/I18n";
import "./UserInvitation.scss";
import Button from "../../components/button/Button";
import moment from "moment";
import {login} from "../../utils/Login";
import ErrorIndicator from "../../components/_redesign/ErrorIndicator";
import SpinnerField from "../../components/_redesign/SpinnerField";
import {ErrorOrigins} from "../../utils/Utils";
import DOMPurify from "dompurify";
import {Toaster, ToasterType} from "@surfnet/sds";

class UserInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {
                user: {},
                collaboration: {collaboration_memberships: []},
                organisation: {organisation_memberships: []}
            },
            isExpired: false,
            errorOccurred: false,
            loading: true,
        };
    }

    componentDidMount = () => {
        const {params} = this.props.match;
        const today = moment();
        if (params.hash) {
            const {isOrganisationInvite} = this.props;
            const promise = isOrganisationInvite ? organisationInvitationByHash(params.hash) : invitationByHash(params.hash)
            promise.then(res => {
                const isExpired = today.isAfter(moment(res.expiry_date * 1000));
                this.setState({invite: res, isExpired: isExpired, loading: false});
            }).catch(() => {
                this.props.history.push(`/404?eo=${ErrorOrigins.invitationNotFound}`);
            });
        } else {
            this.props.history.push("/404");
        }
    };


    renderLoginStep = (isOrganisationInvite) => {
        const nextStep = I18n.t(`models.invitation.steps.${isOrganisationInvite ? "inviteOrg" : "invite"}`)
        return (
            <section className="step-container">
                <div className="step">
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.login")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: nextStep})}</span>
                    </div>
                </div>
                <p className="info"
                   dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.invitation.followingSteps"))}}/>
                <Button onClick={login}
                        centralize={true}
                        txt={I18n.t("models.invitation.loginWithSub")}/>
            </section>
        )
    }

    render() {
        const {isOrganisationInvite} = this.props;
        const {invite, isExpired, errorOccurred, loading} = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const expiredMessage = I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});
        const html = DOMPurify.sanitize(I18n.t("models.invitation.invited", {
            type: isOrganisationInvite ? I18n.t("welcomeDialog.organisation") : I18n.t("welcomeDialog.collaboration"),
            collaboration: isOrganisationInvite ? invite.organisation.name : invite.collaboration.name,
            inviter: invite.user.name,
            email: invite.user.email
        }));
        return (
            <div className="mod-user-invitation">
                {!errorOccurred &&
                <div className="invitation-container">
                    {!isExpired && <h1>{I18n.t("welcomeDialog.hi")}</h1>}
                    {isExpired &&
                    <p className="expired"><ErrorIndicator msg={expiredMessage}/></p>}
                    {!isExpired && <>
                        <Toaster toasterType={ToasterType.Info} message={html}/>
                        {this.renderLoginStep(isOrganisationInvite)}
                    </>}

                </div>}
            </div>);
    }
}

export default UserInvitation;
