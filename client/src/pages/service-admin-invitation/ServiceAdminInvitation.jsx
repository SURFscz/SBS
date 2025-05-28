import React from "react";
import {serviceInvitationByHash} from "../../api";
import I18n from "../../locale/I18n";
import "./ServiceAdminInvitation.scss";
import Button from "../../components/button/Button";
import moment from "moment";
import {login} from "../../utils/Login";
import ErrorIndicator from "../../components/_redesign/error-indicator/ErrorIndicator";
import SpinnerField from "../../components/_redesign/SpinnerField";
import DOMPurify from "dompurify";
import {Toaster, ToasterType} from "@surfnet/sds";

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
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.login")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: nextStep})}</span>
                    </div>
                </div>
                <p className="info"
                   dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.invitation.followingSteps"))}}/>
                <Button onClick={login}
                        centralize={true}
                        txt={I18n.t("models.invitation.loginWithSub")}
                />
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
                    {!isExpired && <h1>{I18n.t("welcomeDialog.hi")}</h1>}
                    {isExpired &&
                    <p className="expired"><ErrorIndicator msg={expiredMessage}/></p>}
                    {!isExpired && <>
                        <Toaster toasterType={ToasterType.Info} message={html}/>
                        {this.renderLoginStep()}
                    </>}

                </div>}
            </div>);
    }
}

export default ServiceAdminInvitation;
