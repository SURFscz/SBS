import React from "react";
import {serviceInvitationByHash} from "../api";
import I18n from "i18n-js";
import "./ServiceAdminInvitation.scss";
import Button from "../components/Button";
import moment from "moment";
import {login} from "../utils/Login";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import SpinnerField from "../components/redesign/SpinnerField";
import DOMPurify from "dompurify";

class ServiceAdminInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {
                user: {},
                service: {service_memberships: []}
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
            serviceInvitationByHash(params.hash).then(res => {
                const isExpired = today.isAfter(moment(res.expiry_date * 1000));
                this.setState({invite: res, isExpired: isExpired, loading: false});
            }).catch(() => {
                this.props.history.push("/404");
            });
        } else {
            this.props.history.push("/404");
        }
    };


    renderLoginStep = () => {
        const nextStep = I18n.t("models.invitation.steps.inviteService")
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
                   dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.invitation.followingSteps"))}}/>
                <Button onClick={login} centralize={true} html={I18n.t("models.invitation.loginWithSub")} txt="login"/>
            </section>
        )
    }

    render() {
        const {invite, isExpired, errorOccurred, loading} = this.state;
        if (loading) {
            return <SpinnerField/>
        }

        const expiredMessage = I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});
        const html = DOMPurify.sanitize(I18n.t("models.invitation.invited", {
            type: I18n.t("welcomeDialog.service"),
            collaboration: invite.service.name,
            inviter: invite.user.name,
            email: invite.user.email
        }));
        return (
            <div className="mod-service-admin-invitation">
                {!errorOccurred &&
                <div className="invitation-container">
                    {!isExpired && <h1>Hi,</h1>}
                    {isExpired &&
                    <p className="expired"><ErrorIndicator msg={expiredMessage}/></p>}
                    {!isExpired && <div className="invitation-inner">
                        <section className="invitation">
                            <span dangerouslySetInnerHTML={{
                                __html: html
                            }}/>
                        </section>
                        {this.renderLoginStep()}
                    </div>}

                </div>}
            </div>);
    }
}

export default ServiceAdminInvitation;
