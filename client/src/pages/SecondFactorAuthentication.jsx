import React from "react";
import {withRouter} from "react-router-dom";
import "./SecondFactorAuthentication.scss";
import {
    get2fa,
    get2faProxyAuthz,
    preUpdate2fa,
    reset2fa,
    tokenResetRequest,
    tokenResetRespondents,
    update2fa,
    verify2fa,
    verify2faProxyAuthz
} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import I18n from "i18n-js";
import Button from "../components/Button";
import InputField from "../components/InputField";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";
import {ErrorOrigins, isEmpty, stopEvent} from "../utils/Utils";
import DOMPurify from "dompurify";
import {Toaster, ToasterType} from "@surfnet/sds";

const TOTP_ATTRIBUTE_NAME = "totp";
const NEW_TOTP_ATTRIBUTE_NAME = "newTotp";

class SecondFactorAuthentication extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            totp: Array(6).fill(""),
            newTotp: Array(6).fill(""),
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
            resetCodeError: null,
            continueUrl: null,
            secondFaUuid: null
        };
        this.totpRefs = Array(6).fill("");
        this.totpNewRefs = Array(6).fill("");
    }

    componentDidMount() {
        const {config, user, update, match} = this.props;

        const urlSearchParams = new URLSearchParams(window.location.search);
        const second_fa_uuid = match.params.second_fa_uuid;

        const continueUrl = urlSearchParams.get("continue_url");
        const continueUrlTrusted = config.continue_eduteams_redirect_uri;
        if (continueUrl && !continueUrl.toLowerCase().startsWith(continueUrlTrusted.toLowerCase())) {
            throw new Error(`Invalid continue url: '${continueUrl}'`)
        }

        if (user.guest) {
            if (second_fa_uuid && continueUrl) {
                //We need to know if this is a new user. We use the second_fa_uuid for this
                get2faProxyAuthz(second_fa_uuid)
                    .then(res => {
                        this.setState({
                            loading: false,
                            secondFaUuid: second_fa_uuid,
                            qrCode: res.qr_code_base64,
                            idp_name: res.idp_name || I18n.t("mfa.register.unknownIdp"),
                            continueUrl: continueUrl
                        });
                        this.focusCode();
                    }).catch(() => this.props.history.push(`/404?eo=${ErrorOrigins.invalidSecondFactorUUID}`))
            } else {
                this.props.history.push("/landing");
            }
        } else if (!user.second_factor_auth || update) {
            get2fa().then(res => {
                this.setState({
                    qrCode: res.qr_code_base64,
                    idp_name: res.idp_name || I18n.t("mfa.register.unknownIdp"),
                    loading: false
                });
                this.focusCode();
            });
        } else {
            this.setState({
                secondFaUuid: second_fa_uuid,
                continueUrl: continueUrl,
                loading: false
            });
            this.focusCode();
        }
    }

    onKeyDownTotp = (index, refs) => e => {
        if ((e.key === "Delete" || e.key === "Backspace") && index > 0 && e.target.value === "") {
            refs[index - 1].focus();
        }
        return true;
    }

    onChangeTotp = (index, attributeName, refs, onLastEntryVerify) => e => {
        const {update} = this.props;
        const val = e.target.value;
        if (isNaN(val)) {
            return;
        }
        const totp = this.state[attributeName];
        const newValue = [...totp];
        newValue[index] = e.target.value;
        this.setState({[attributeName]: newValue}, () => {
            if (index !== 5) {
                refs[index + 1].focus();
            } else if (onLastEntryVerify) {
                this.verify();
            } else if (update) {
                this.preUpdateVerify();
            } else {
                this.totpNewRefs[0].focus();
            }
        });
    }

    focusCode = () => {
        setTimeout(() => {
            if (this.totpRefs && this.totpRefs[0] !== "") {
                this.totpRefs[0].focus();
                window.scrollTo(0, 0);
            }
        }, 350);
    }

    enterResetToken = e => {
        stopEvent(e);
        this.setState({showEnterToken: true})
    }

    openResetRequest = e => {
        stopEvent(e);
        const {respondents, secondFaUuid} = this.state;
        if (respondents.length === 0) {
            this.setState({loading: true});
            tokenResetRespondents(secondFaUuid).then(res => {
                res.forEach(respondent => respondent.selected = false);
                res[0].selected = true;
                this.setState({respondents: res, loading: false, showExplanation: true});
            });
        } else {
            this.setState({showExplanation: true});
        }
    }

    onSelectRespondent = email => () => {
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
        const {respondents, message, secondFaUuid} = this.state;
        const admin = respondents.find(respondent => respondent.selected);
        tokenResetRequest(admin, message, secondFaUuid).then(() => {
            setFlash(I18n.t("mfa.lost.flash"));
            this.setState({showExplanation: false, message: ""});
        });
    }

    submitResetCode = () => {
        this.setState({loading: true});
        const {resetCode} = this.state;
        reset2fa(resetCode)
            .then(() => {
                this.props.refreshUser(() => {
                    this.setState({resetCode: false, showEnterToken: false});
                    this.componentDidMount();
                })
            }).catch(() => {
            this.setState({resetCodeError: true, loading: false});
        });
    }

    preUpdateVerify = () => {
        this.setState({busy: true});
        const {totp} = this.state;
        preUpdate2fa(totp.join("")).then(() => {
            setFlash(I18n.t("mfa.update.preValidatedFlash"));
            this.setState({busy: false, error: false},
                () => this.totpNewRefs[0].focus());
        }).catch(() => this.setState({busy: false, error: true, totp: Array(6).fill("")},
            () => this.totpRefs[0].focus()));
    }

    verify = () => {
        this.setState({busy: true});
        const {totp, newTotp, secondFaUuid, continueUrl} = this.state;
        const {update} = this.props;
        if (update) {
            update2fa(newTotp.join("")).then(() => {
                this.props.history.push("/profile");
                setFlash(I18n.t("mfa.update.flash"));
            }).catch(() => this.setState({
                            busy: false,
                            newError: true,
                            newTotp: Array(6).fill("")
                        }, () => this.totpNewRefs[0].focus()));
        } else if (secondFaUuid && continueUrl) {
            verify2faProxyAuthz(totp.join(""), secondFaUuid, continueUrl).then(r => {
                window.location.href = r.location;
            }).catch(e => {
                if (e.response && e.response.status === 429) {
                    this.props.history.push("/landing?rate-limited=true");
                } else {
                    this.setState({busy: false, error: true, totp: Array(6).fill("")},
                        () => this.totpRefs[0].focus());
                }
            });
        } else {
            verify2fa(totp.join("")).then(r => {
                this.props.refreshUser(() => {
                    const url = new URL(r.location)
                    this.props.history.push(url.pathname + url.search);
                });
            }).catch(e => {
                if (e.response && e.response.status === 429) {
                    this.props.history.push("/landing?rate-limited=true");
                } else {
                    this.setState({busy: false, error: true, totp: Array(6).fill("")},
                        () => this.totpRefs[0].focus());
                }
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
                    <li key={i} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(option)}}/>)}
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
                <Button cancelButton={true}
                        onClick={this.closeExplanation}
                        txt={I18n.t("forms.cancel")}
                />
                <Button disabled={submitDisabled}
                        onClick={this.sendResetRequest}
                        txt={I18n.t("mfa.lost.sendMail")}
                />
            </section>
        </div>)


    }

    renderVerificationCode = (totp, busy, showExplanation, error) => {
        const verifyDisabled = isEmpty(totp[5]) || busy;
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t("mfa.verify.title")}</h1>
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(`${I18n.t("mfa.verify.info1")}`)
                    }}/>
                </section>
                <div className="step-actions center">
                    <div className="input-field-container">
                        {this.totpValueContainer(totp, TOTP_ATTRIBUTE_NAME, this.totpRefs, true)}
                        {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                    </div>
                </div>
                <Button disabled={verifyDisabled}
                        onClick={this.verify}
                        txt={I18n.t("mfa.verify.signIn")}
                        centralize={true}/>
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
                        __html: DOMPurify.sanitize(`${I18n.t("mfa.reset.info1")}`)
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
                    <Button cancelButton={true}
                            onClick={this.closeResetCode}
                            txt={I18n.t("forms.cancel")}
                    />
                    <Button disabled={submitDisabled}
                            onClick={this.submitResetCode}
                            txt={I18n.t("mfa.reset.submit")}
                    />
                </section>
            </div>
        )
    }

    totpValueContainer = (totp, attributeName, refs, onLastEntryVerify, disableNewTotp = false) => {
        return (
            <div className="totp-value-container">
                {Array(6).fill("").map((val, index) =>
                    <input type="text"
                           key={`${attributeName}_${index}`}
                           disabled={(totp[index] || "").length === 0 && ((index !== 0 && totp[index - 1] === "") ||
                               (disableNewTotp && this.state.totp[5] === ""))}
                           value={totp[index] || ""}
                           onChange={this.onChangeTotp(index, attributeName, refs, onLastEntryVerify)}
                           onKeyDown={this.onKeyDownTotp(index, refs)}
                           maxLength={1}
                           ref={ref => {
                               refs[index] = ref;
                           }}
                           className="totp-value"/>
                )}
            </div>

        );
    }

    renderRegistration = (qrCode, totp, newTotp, idp_name, busy, error, newError, update) => {
        const verifyDisabled = isEmpty(totp[5]) || busy;
        const updateDisabled = isEmpty(totp[5]) || isEmpty(newTotp[5]) || busy;
        const action = update ? "update" : "register";
        return (
            <div>
                <section className="register-header">
                    <h1>{I18n.t(`mfa.register.${update ? "titleUpdate" : "title"}`)}</h1>
                    <Toaster message={I18n.t(`mfa.${action}.info1`, {name: idp_name})}
                             toasterType={ToasterType.Info}/>
                    <p>{I18n.t(`mfa.${action}.info2`)}</p>
                </section>
                {!update && <div className="step">
                    <h2>{I18n.t("mfa.register.getApp")}</h2>
                    <ul>
                        <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("mfa.register.getAppInfo", {new: update ? I18n.t("mfa.register.new") : ""}),
                                {ADD_ATTR: ['target']})
                        }}/>
                        <li dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("mfa.register.addSRAM"))}}/>
                        <li dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("mfa.register.scan"))}}/>
                    </ul>
                    <div className="qr-code-container">
                        <img alt="QR code" src={`data:image/png;base64,${qrCode}`}/>
                    </div>
                </div>}
                {update &&
                <div className="step">
                    <h2>{I18n.t("mfa.update.currentCode")}</h2>
                    <div className="step-actions">
                        <p>{I18n.t("mfa.update.currentCodeInfo")}</p>
                        {this.totpValueContainer(totp, TOTP_ATTRIBUTE_NAME, this.totpRefs, false)}
                        {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                    </div>
                </div>}
                {update && <div className="step">
                    {update ? <h2>{I18n.t("mfa.register.getAppUpdate")}</h2> : <h2>{I18n.t("mfa.register.getApp")}</h2>}
                    <ul>
                        <li dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("mfa.register.getAppInfo", {new: update ? I18n.t("mfa.register.new") : " "}),
                                {ADD_ATTR: ['target']})
                        }}/>
                        <li dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("mfa.register.addSRAM"))}}/>
                        <li dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("mfa.register.scan"))}}/>
                    </ul>
                    <div className="qr-code-container">
                        <img alt="QR code" src={`data:image/png;base64,${qrCode}`}/>
                    </div>
                </div>}

                <div className="step">
                    <div className="step-actions">
                        {update ? <h2>{I18n.t("mfa.register.verificationCodeUpdate")}</h2> :
                            <h2>{I18n.t("mfa.register.verificationCode")}</h2>}
                        <p>{I18n.t("mfa.register.verificationCodeInfo")}</p>
                        {!update && <>
                            {this.totpValueContainer(totp, TOTP_ATTRIBUTE_NAME, this.totpRefs, true)}
                            {error && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                        </>}
                        {update && <>
                            {this.totpValueContainer(newTotp, NEW_TOTP_ATTRIBUTE_NAME, this.totpNewRefs, true, true)}
                            {newError && <span className="error">{I18n.t("mfa.verify.invalid")}</span>}
                        </>}
                    </div>
                </div>
                {!update &&
                <Button disabled={verifyDisabled} onClick={this.verify}
                        txt={I18n.t("mfa.register.next")}
                        centralize={true}/>}
                {update && <section className="actions">
                    <Button cancelButton={true}
                            onClick={this.cancel}
                            txt={I18n.t("forms.cancel")}
                    />
                    <Button disabled={updateDisabled}
                            onClick={this.verify}
                            txt={I18n.t("mfa.update.verify")}
                    />
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