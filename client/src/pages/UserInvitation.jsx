import React from "react";
import {invitationByHash, organisationInvitationByHash} from "../api";
import I18n from "i18n-js";
import "./UserInvitation.scss";
import Button from "../components/Button";
import moment from "moment";
import {login} from "../utils/Login";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import SpinnerField from "../components/redesign/SpinnerField";

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
            }).catch(e => {
                this.props.history.push("/404");
            });
        } else {
            this.props.history.push("/404");
        }
    };


    renderLoginStep = (isOrganisationInvite) => {
        const nextStep = I18n.t(`models.invitation.steps.${isOrganisationInvite ? "inviteOrg":"invite"}`)
        return (
            <section className="step-container">
                <div className="step">
                    <div className="circle two-quarters">
                        <span>{I18n.t("models.invitation.steps.progress", {now: "1", total: "2"})}</span>
                    </div>
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.login")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: nextStep})}</span>
                    </div>
                </div>
                <p className="info"
                   dangerouslySetInnerHTML={{__html: I18n.t("models.invitation.followingSteps")}}/>
                <Button onClick={login} centralize={true} html={I18n.t("models.invitation.loginWithSub")} txt="login"/>
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
        return (
            <div className="mod-user-invitation">
                {!errorOccurred &&
                <div className="invitation-container">
                    {!isExpired && <h1>Hi,</h1>}
                    {isExpired &&
                    <p className="expired"><ErrorIndicator msg={expiredMessage}/></p>}
                    {!isExpired && <div className="invitation-inner">
                        <section className="invitation">
                            <span dangerouslySetInnerHTML={{
                                __html: I18n.t("models.invitation.invited", {
                                    type: isOrganisationInvite ? I18n.t("welcomeDialog.organisation") : I18n.t("welcomeDialog.collaboration"),
                                    collaboration: isOrganisationInvite ? invite.organisation.name : invite.collaboration.name,
                                    inviter: invite.user.name,
                                    email: invite.user.email
                                })
                            }}/>
                        </section>
                        {this.renderLoginStep(isOrganisationInvite)}
                    </div>}

                </div>}
            </div>);
    };
}

export default UserInvitation;
