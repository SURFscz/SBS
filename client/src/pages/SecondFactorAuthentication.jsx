import React from "react";
import {withRouter} from "react-router-dom";
import "./SecondFactorAuthentication.scss";
import {get2fa, reset2fa, tokenResetRequest, tokenResetRespondents, update2fa, verify2fa} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import I18n from "i18n-js";
import Button from "../components/Button";
import InputField from "../components/InputField";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";
import {stopEvent} from "../utils/Utils";

class SecondFactorAuthentication extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            totp: "",
            newTotp: "",
            qrCode: null,
            busy: false,
            loading: true,
            error: null,
            newError: null,
            idp_name: "",
            showExplanation: false,
            showEnterToken: false,
            respondents: [],
            message: "",
            resetCode: "",
            resetCodeError: null
        };
    }

    componentDidMount() {
        const {user, update} = this.props;
        if (!user.second_factor_auth || update) {
            get2fa().then(res => {
                this.setState({
                    qrCode: res.qr_code_base64,
                    idp_name: res.idp_name,
                    loading: false
                });
                this.focusCode();
            });
        } else {
            this.setState({loading: false});
            this.focusCode();
        }
    }

    focusCode = () => {
        setTimeout(() => {
            if (this.ref) {
                this.ref.focus();
            }
        }, 350);
    }

    enterResetToken = e => {
        stopEvent(e);
        this.setState({showEnterToken: true})
    }

    openResetRequest = e => {
        stopEvent(e);
        const {respondents} = this.state;
        if (respondents.length === 0) {
            this.setState({loading: true});
            tokenResetRespondents().then(res => {
                res.forEach(respondent => respondent.selected = false);
                res[0].selected = true;
                this.setState({respondents: res, loading: false, showExplanation: true});
            });
        } else {
            this.setState({showExplanation: true});
        }
    }

    onSelectRespondent = email => e => {
        const {respondents} = this.state;
        const newRespondents = respondents.map(respondent => {
            respondent.selected = respondent.email === email;
            return respondent;
        });
        this.setState({respondents: newRespondents});
    }

    closeExplanation = () => {
        this.setState({showExplanation: false, resetCodeError: null, newError: null, error: null});
    }

    closeResetCode = () => {
        this.setState({showEnterToken: false, resetCodeError: null, newError: null, error: null});
    }

    cancel = () => {
        this.props.history.push("/profile");
    }

    sendResetRequest = () => {
        const {respondents, message} = this.state;
        const admin = respondents.find(respondent => respondent.selected);
        tokenResetRequest(admin, message).then(() => {
            setFlash(I18n.t("mfa.lost.flash"));
            this.setState({showExplanation: false, message: ""})
        });
    }

    submitResetCode = () => {
        const {resetCode} = this.state;
        reset2fa(resetCode)
            .then(() => {
                this.props.refreshUser(() => {
                    this.setState({showEnterToken: false})
                })
            }).catch(e => {
            this.setState({resetCodeError: true})
        });
    }

    verify = () => {
        this.setState({busy: true});
        const {totp, newTotp} = this.state;
        const {update} = this.props;
        if (update) {
            update2fa(newTotp, totp).then(() => {
                this.props.history.push("/profile");
                setFlash(I18n.t("mfa.update.flash"));
            }).catch(e => {
                if (e.response && e.response.json) {
                    e.response.json().then(res => {
                        this.setState({
                            busy: false,
                            error: res.current_totp, newError: res.new_totp
                        });
                    })
                }
            });
        } else {
            verify2fa(totp).then(r => {
                if (r.in_proxy_flow) {
                    window.location.href = r.location;
                } else {
                    this.props.refreshUser(() => {
                        const url = new URL(r.location)
                        this.props.history.push(url.pathname + url.search);
                    });
                }
            }).catch(() => {
                this.setState({busy: false, error: true})
            });
        }
    }

    renderLostCode = (respondents, message) => {
        const submitDisabled = respondents.filter(respondent => respondent.selected).length === 0;
        return (<div className="authenticator-problems">

            <h1>{I18n.t("mfa.lost.title")}</h1>
            <p>{I18n.t("mfa.lost.info")}</p>
            <ul>
                {I18n.translations[I18n.locale].mfa.lost.reasons.map((option, i) =>
                    <li key={i} dangerouslySetInnerHTML={{__html: option}}/>)}
            </ul>
            <p>{I18n.t("mfa.lost.request")}</p>
            {respondents.length > 1 && <div className="select-respondents">
                <p>{I18n.t("mfa.lost.select")}</p>
                {respondents.map((respondent, i) => <div key={i}>
                    <CheckBox name={`respondent${i}`}
                              onChange={this.onSelectRespondent(respondent.email)}
                              value={respondent.selected}
                              info={respondent.name}
                    />
                </div>)}
            </div>}
            {respondents.length === 1 && <div className="select-respondents">
                <p>{I18n.t("mfa.lost.respondent")}</p>
                <div>
                    <CheckBox name={`respondent`}
                              value={true}
                              readOnly={true}
                              info={respondents[0].name}
                    />
                </div>
            </div>}
            <InputField value={message} multiline={true} name={I18n.t("mfa.lost.message")}
                        onChange={e => this.setState({message: e.target.value})}/>

            <section className="actions">
                <Button cancelButton={true} onClick={this.closeExplanation} html={I18n.t("forms.cancel")}
                        txt="cancel"/>
                <Button disabled={submitDisabled} onClick={this.sendResetRequest} html={I18n.t("mfa.lost.sendMail")}
                        txt="update"/>
            </section>
        </div>)


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
                <div className="explain">
                    <span>{I18n.t("mfa.verify.problems")}</span>
                    <a href="/reset-token" onClick={this.openResetRequest}>{I18n.t("mfa.verify.resetRequest")}</a>
                    <a href="/enter-reset" onClick={this.enterResetToken}>{I18n.t("mfa.verify.resetToken")}</a>
                </div>
            </div>
        )
    }

    renderEnterResetCode = (resetCode, resetCodeError, busy) => {
        const submitDisabled = resetCode.length === 0 || busy;
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t("mfa.reset.title")}</h1>
                    <p dangerouslySetInnerHTML={{
                        __html:
                            `${I18n.t("mfa.reset.info1")}`
                    }}/>
                </section>
                <div className="step-actions center">
                    <div className="input-field-container-large">
                        <InputField value={resetCode}
                                    onEnter={this.submitResetCode}
                                    placeholder={I18n.t("mfa.reset.resetCodePlaceholder")}
                                    onChange={e => this.setState({resetCode: e.target.value})}/>
                        {resetCodeError && <span className="error">{I18n.t("mfa.reset.invalid")}</span>}
                    </div>
                </div>
                <section className="actions">
                    <Button cancelButton={true} onClick={this.closeResetCode} html={I18n.t("forms.cancel")}
                            txt="cancel"/>
                    <Button disabled={submitDisabled} onClick={this.submitResetCode} html={I18n.t("mfa.reset.submit")}
                            txt="update"/>
                </section>
            </div>
        )
    }

    renderRegistration = (qrCode, totp, newTotp, idp_name, busy, error, newError, update) => {
        const verifyDisabled = totp.length !== 6 || busy;
        const updateDisabled = totp.length !== 6 || newTotp.length !== 6 || busy;
        const action = update ? "update" : "register";
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t("mfa.register.title")}</h1>
                    <p>{I18n.t(`mfa.${action}.info1`, {name: idp_name})}</p>
                    <p>{I18n.t(`mfa.${action}.info2`)}</p>
                </section>
                {!update && <section className="step-container">
                    <div className="step">
                        <div className="circle one-third">
                            <span>{I18n.t("mfa.register.step", {nbr: "1"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.register.getApp")}</h3>
                            <span>{I18n.t("mfa.register.getAppInfo")}</span>
                        </div>
                    </div>
                </section>}
                {update && <section className="step-container">
                    <div className="step">
                        <div className="circle one-third">
                            <span>{I18n.t("mfa.register.step", {nbr: "1"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.update.currentCode")}</h3>
                            <span>{I18n.t("mfa.update.currentCodeInfo")}</span>
                            <InputField value={totp}
                                        maxLength={6}
                                        onRef={ref => this.ref = ref}
                                        placeholder={I18n.t("mfa.register.verificationCodePlaceholder")}
                                        onChange={e => this.setState({totp: e.target.value})}/>
                            {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                        </div>
                    </div>
                </section>}
                <section className="step-container">
                    <div className="step clear">
                        <div className="circle two-third">
                            <span>{I18n.t("mfa.register.step", {nbr: "2"})}</span>
                        </div>
                        <div className="step-actions">
                            <h3>{I18n.t("mfa.register.scan")}</h3>
                            <span>{I18n.t(`mfa.${action}.scanInfo`)}</span>
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
                            <span>{I18n.t(`mfa.${action}.verificationCodeInfo`)}</span>
                            {!update && <div>
                                <InputField value={totp}
                                            maxLength={6}
                                            onEnter={this.verify}
                                            onRef={ref => this.ref = ref}
                                            placeholder={I18n.t("mfa.register.verificationCodePlaceholder")}
                                            onChange={e => this.setState({totp: e.target.value})}/>
                                {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                            </div>}
                            {update && <div>
                                <InputField value={newTotp}
                                            maxLength={6}
                                            onEnter={this.verify}
                                            placeholder={I18n.t("mfa.register.verificationCodePlaceholder")}
                                            onChange={e => this.setState({newTotp: e.target.value})}/>
                                {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                            </div>}
                        </div>
                    </div>
                </section>
                {!update &&
                <Button disabled={verifyDisabled} onClick={this.verify} html={I18n.t("mfa.register.verify")}
                        txt="login"/>}
                {update && <section className="actions">
                    <Button cancelButton={true} onClick={this.cancel} html={I18n.t("forms.cancel")}
                            txt="cancel"/>
                    <Button disabled={updateDisabled} onClick={this.verify} html={I18n.t("mfa.update.verify")}
                            txt="update"/>
                </section>}
            </div>
        )
    }

    render() {
        const {update} = this.props;
        const {
            loading, totp, qrCode, idp_name, busy, showExplanation, error, respondents, message,
            newTotp, newError, showEnterToken, resetCode, resetCodeError
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        return (
            <div className={`mod-mfa ${qrCode ? '' : 'verify'}`}>
                {(qrCode && !showExplanation && !showEnterToken) && this.renderRegistration(qrCode, totp, newTotp, idp_name, busy, error, newError, update)}
                {(!qrCode && !showExplanation && !showEnterToken) && this.renderVerificationCode(totp, busy, showExplanation, error, showEnterToken)}
                {(showExplanation && !showEnterToken) && this.renderLostCode(respondents, message)}
                {(!showExplanation && showEnterToken) && this.renderEnterResetCode(resetCode, resetCodeError, busy)}
            </div>
        )
    }
}

export default withRouter(SecondFactorAuthentication);