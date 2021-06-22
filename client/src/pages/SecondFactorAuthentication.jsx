import React from "react";
import {withRouter} from "react-router-dom";
import "./SecondFactorAuthentication.scss";
import {get2fa, verify2fa} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import I18n from "i18n-js";
import Button from "../components/Button";
import InputField from "../components/InputField";
import Explain from "../components/Explain";
import TwoFactorAuthentication from "../components/explanations/TwoFactorAuthentication";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class SecondFactorAuthentication extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            totp: "",
            qrCode: null,
            busy: false,
            loading: true,
            error: null,
            idp_name: "",
            showExplanation: false
        };
    }

    componentDidMount() {
        const {user} = this.props;
        if (!user.second_factor_auth) {
            get2fa().then(res => {
                this.setState({qrCode: res.qr_code_base64, idp_name: res.idp_name, loading: false});
                setTimeout(() => {
                    if (this.ref) {
                        this.ref.focus();
                    }
                }, 350);

            });
        } else {
            this.setState({loading: false});
            setTimeout(() => {
                if (this.ref) {
                    this.ref.focus();
                }
            }, 350);
        }
    }

    closeExplanation = () => this.setState({showExplanation: false});

    verify = () => {
        this.setState({busy: true});
        const {totp} = this.state;
        verify2fa(totp).then(r => {
            this.props.refreshUser(() => {
                const url = new URL(r.location)
                this.props.history.push(url.pathname + url.search);
            })
        }).catch(() => {
            this.setState({busy: false, error: true})
        })
    }

    renderVerificationCode = (totp, busy, showExplanation, error) => {
        const verifyDisabled = totp.length !== 6 || busy;
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t("mfa.verify.title")}</h1>
                    <p dangerouslySetInnerHTML={{
                        __html:
                            `${I18n.t("mfa.verify.info1")}`
                    }}/>
                </section>
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("mfa.verify.explanation")}
                    isVisible={showExplanation}>
                    <TwoFactorAuthentication/>
                </Explain>
                <div className="step-actions center">
                    <div className="input-field-container">
                        <InputField value={totp}
                                    maxLength={6}
                                    onRef={ref => this.ref = ref}
                                    onEnter={this.verify}
                                    placeholder={I18n.t("mfa.register.verificationCodePlaceholder")}
                                    onChange={e => this.setState({totp: e.target.value})}/>
                        {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                    </div>
                </div>
                <Button disabled={verifyDisabled} onClick={this.verify} html={I18n.t("mfa.verify.signIn")}
                        txt="login"/>
                <div className="explain" onClick={() => this.setState({showExplanation: true})}>
                    <FontAwesomeIcon className="help" icon="question-circle"
                                     id="impersonate_close_explanation"/>
                    {I18n.t("mfa.verify.problems")}

                </div>

            </div>
        )
    }

    renderRegistration = (qrCode, totp, idp_name, busy, error) => {
        const verifyDisabled = totp.length !== 6 || busy;
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t("mfa.register.title")}</h1>
                    <p>{I18n.t("mfa.register.info1", {name: idp_name})}</p>
                    <p>{I18n.t("mfa.register.info2")}</p>
                </section>
                <section className="step-container">
                    <div className="step">
                        <div className="circle one-third">
                            <span>{I18n.t("mfa.register.step", {nbr: "1"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.register.getApp")}</h3>
                            <span>{I18n.t("mfa.register.getAppInfo")}</span>
                        </div>
                    </div>
                </section>
                <section className="step-container">
                    <div className="step clear">
                        <div className="circle two-third">
                            <span>{I18n.t("mfa.register.step", {nbr: "2"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.register.scan")}</h3>
                            <span>{I18n.t("mfa.register.scanInfo")}</span>
                            <ul>
                                {I18n.translations[I18n.locale].mfa.register.scanSteps.map((option, i) =>
                                    <li key={i} dangerouslySetInnerHTML={{__html: option}}/>)}
                            </ul>
                            <div className="qr-code-container">
                                <img alt="QR code" src={`data:image/png;base64,${qrCode}`}/>
                            </div>

                        </div>
                    </div>
                </section>
                <section className="step-container">
                    <div className="step">
                        <div className="circle full">
                            <span>{I18n.t("mfa.register.step", {nbr: "3"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.register.verificationCode")}</h3>
                            <span>{I18n.t("mfa.register.verificationCodeInfo")}</span>
                            <InputField value={totp}
                                        maxLength={6}
                                        onEnter={this.verify}
                                        onRef={ref => this.ref = ref}
                                        placeholder={I18n.t("mfa.register.verificationCodePlaceholder")}
                                        onChange={e => this.setState({totp: e.target.value})}/>
                            {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                        </div>
                    </div>
                </section>
                <Button disabled={verifyDisabled} onClick={this.verify} html={I18n.t("mfa.register.verify")}
                        txt="login"/>
            </div>
        )
    }

    render() {
        const {loading, totp, qrCode, idp_name, busy, showExplanation, error} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        return (
            <div className={`mod-mfa ${qrCode ? '' : 'verify'}`}>
                {qrCode && this.renderRegistration(qrCode, totp, idp_name, busy, error)}
                {!qrCode && this.renderVerificationCode(totp, busy, showExplanation, error)}
            </div>
        )
    }
}

export default withRouter(SecondFactorAuthentication);