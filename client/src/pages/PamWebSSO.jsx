import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "../locale/I18n";
import "./PamWebSSO.scss";
import Button from "../components/Button";
import {pamWebSSOSession} from "../api";
import SpinnerField from "../components/redesign/SpinnerField";
import {ErrorOrigins} from "../utils/Utils";
import Logo from "../components/redesign/Logo";
import {login} from "../utils/Login";
import ClipBoardCopy from "../components/redesign/ClipBoardCopy";
import DOMPurify from "dompurify";


class PamWebSSO extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            pamSession: {},
            service: {},
            loading: true
        };
    }

    componentDidMount = () => {
        const {service, session_id} = this.props.match.params;
        pamWebSSOSession(service, session_id)
            .then(res => {
                this.setState({
                    validation: res.validation,
                    service: res.service,
                    pin: res.pin,
                    loading: false
                })
            })
            .catch(() => this.props.history.push(`/404?eo=${ErrorOrigins.invalidPamWebSSO}`));
    };

    renderService = service => {
        return (
            <div className="service">
                <div className="image">
                    <Logo src={service.logo}/>
                </div>
                <div className="details">
                    <h3>{service.name}</h3>
                    <p className="info">{service.description}</p>
                    {service.uri && <div className="org-attribute">
                        <span className="attr">{I18n.t("service.uri")}: </span>
                        <a href={service.uri} target="_blank" rel="noopener noreferrer">{service.uri}</a>
                    </div>}
                    {service.support_email &&
                    <div className="org-attribute">
                        <span className="attr">{I18n.t("service.support_email")}: </span>
                        <a href={`mailto:${service.support_email}`}>{service.support_email}</a>
                    </div>}

                </div>
            </div>
        );
    }

    renderFailure = service => {
        const support = service.support_email || "sram-support@surf.nl"
        return (
            <div className="failure">
                <h1>{I18n.t("pamWebSSO.denied", {service: service.name})}</h1>
                <p className="info">{I18n.t("pamWebSSO.deniedInfo")}</p>
                {this.renderService(service)}
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("pamWebSSO.contact", {support}))}}/>
            </div>
        );
    }

    renderLogin = service => {
        return (
            <>
                <h1>{I18n.t("pamWebSSO.title", {service: service.name})}</h1>
                {this.renderService(service)}
                <p className="pin">{I18n.t("pamWebSSO.info")}</p>
                <div className="actions">
                    <Button className="login" onClick={login} centralize={true}
                            txt={I18n.t("pamWebSSO.proceed")}/>
                </div>
            </>
        );
    }

    renderPin = (service, pin) => {
        return (
            <div className="success">
                <h1>{I18n.t("pamWebSSO.enterPin")}</h1>
                <div className="pin-value">
                    <div className="pin-value-inner">
                        <span className="value">{pin}</span>
                        <ClipBoardCopy transparentBackground={true} txt={pin}/>
                    </div>
                </div>
                <p>{I18n.t("pamWebSSO.enterPinInfo", {service: service.name})}</p>
                <p className={"info"}>{I18n.t("pamWebSSO.afterPin")}</p>
            </div>
        );
    }

    render() {
        const {validation, service, pin, loading} = this.state;

        if (loading) {
            return <SpinnerField/>;
        }

        return (
            <div className="mod-pam-web-sso-container">
                <div className="mod-pam-web-sso">
                    {!validation && this.renderLogin(service)}
                    {(validation && validation.result !== "SUCCESS") && this.renderFailure(service, pin)}
                    {(validation && validation.result === "SUCCESS") && this.renderPin(service, pin)}
                </div>
            </div>
        )
    }
}

export default withRouter(PamWebSSO);