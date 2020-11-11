import React from "react";
import {agreeAup, aupLinks, invitationAccept, invitationByHash} from "../api";
import I18n from "i18n-js";
import "./UserInvitation.scss";
import Button from "../components/Button";
import {setFlash} from "../utils/Flash";
import moment from "moment";
import {login} from "../utils/Login";
import {stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";

class UserInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invite: {user: {}, collaboration: {collaboration_memberships: []},},
            acceptedTerms: false,
            personalDataConfirmation: false,
            initial: true,
            isExpired: false,
            errorOccurred: false,
            aup: {},
            loaded: false
        };
    }

    componentDidMount = () => {
        const {params} = this.props.match;
        const today = moment();
        if (params.hash) {
            invitationByHash(params.hash)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    this.setState({invite: json, isExpired: isExpired, loaded: true});
                    const {user} = this.props;
                    if (!user.guest && user.needs_to_agree_with_aup) {
                        aupLinks().then(res => this.setState({"aup": res}));

                    }
                }).catch(() => setFlash(I18n.t("organisationInvitation.flash.notFound"), "error"));
        } else {
            this.props.history.push("/404");
        }
    };

    doSubmit = () => {
        const {invite} = this.state;
        invitationAccept(invite)
            .then(res => {
                this.props.refreshUser(() => {
                    this.props.history.push(`/collaborations/${invite.collaboration_id}?first=true`);
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

    agreeWith = e => agreeAup().then(() => {
        stopEvent(e);
        this.props.refreshUser(() => {
            const location = getParameterByName("state", window.location.search) || "/home";
            this.props.history.push(location)
        });
    });

    accept = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    renderAupStep = () => {
        const {aup} = this.state;

        return (
            <section className="step-container">
                <div className="step">
                    <div className="circle two-quarters">
                        <span>{I18n.t("models.invitation.steps.progress", {now: "2", total: "4"})}</span>
                    </div>
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.aup")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: I18n.t("models.invitation.steps.invite")})}</span>
                    </div>
                </div>
                <div className="htmlAup" dangerouslySetInnerHTML={{__html: aup.html}}/>
                <div className="download">
                    <a href={aup.pdf_link} className="pdf" download={aup.pdf} target="_blank" rel="noopener noreferrer">
                        {I18n.t("aup.downloadPdf")}
                    </a>
                </div>
                <Button onClick={() => this.setState({acceptedTerms: true})}
                        txt={<span>{I18n.t("models.invitation.accept")}</span>}/>
                <Button onClick={this.cancel} cancelButton={true}
                        txt={<span>{I18n.t("models.invitation.noAccept")}</span>}/>
            </section>
        )
    }


    renderLoginStep = () => {
        return (
            <section className="step-container">
                <div className="step">
                    <div className="circle one-quarters">
                        <span>{I18n.t("models.invitation.steps.progress", {now: "1", total: "4"})}</span>
                    </div>
                    <div className="step-actions">
                        <h1>{I18n.t("models.invitation.steps.login")}</h1>
                        <span>{I18n.t("models.invitation.steps.next", {step: I18n.t("models.invitation.steps.aup")})}</span>
                    </div>
                </div>
                <Button onClick={login} txt={<span>{I18n.t("models.invitation.login")}<sup> *</sup></span>}/>
                <p className="tip"><sup>*</sup>{I18n.t("models.invitation.loginTip")}</p>
            </section>
        )
    }

    render() {
        const {user} = this.props;
        
        const {
            invite, acceptedTerms, initial, isExpired, errorOccurred, personalDataConfirmation, knownUser
        } = this.state;
        let step = "login";
        const expiredMessage = I18n.t("invitation.expired", {expiry_date: moment(invite.expiry_date * 1000).format("LL")});
        const aup = invite.collaboration.accepted_user_policy;
        return (
            <div className="mod-user-invitation">
                {!errorOccurred &&
                <div className="invitation-container">
                    <h1>Hi,</h1>
                    {isExpired &&
                    <p className="error">{expiredMessage}</p>}
                    {!isExpired && <div className="invitation-inner">
                        <p className="info">{I18n.t("models.invitation.welcome")}</p>
                        <section className="invitation">
                            {I18n.t("models.invitation.invited", {
                                collaboration: invite.collaboration.name,
                                inviter: invite.user.name
                            })}
                        </section>
                        <p className="info">{I18n.t("models.invitation.followingSteps")}</p>
                        {(user.guest) && this.renderLoginStep()}
                        {(!user.guest && user.needs_to_agree_with_aup && !acceptedTerms) && this.renderAupStep()}
                    </div>}

                </div>}
            </div>);
    };
}

export default UserInvitation;
