import React from "react";
import "./Button.scss";
import DOMPurify from "dompurify";
import I18n from "i18n-js";
import CreateLogo from "../icons/landing/sketch.svg";
import InviteLogo from "../icons/landing/mail.svg";
import JoinLogo from "../icons/landing/screen.svg";
import CollaborateLogo from "../icons/landing/collaborate.svg";
import "./LandingInfo.scss";

export default function LandingInfo() {
    const infoBlock = (name, isAdminFunction, Logo, reversed) =>
        <div key={name} className={`mod-login info ${reversed ? "reversed" : ""}`}>
            <div className="header-left info">
                <div className={"info-title"}>
                    <h3>{I18n.t(`landing.${name}`)}</h3>
                    {isAdminFunction && <div className={"admin-function-container"}>
                        <span className={"admin-function"}>{I18n.t("landing.adminFunction")}</span>
                    </div>}
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`landing.${name}Info`))}}/>
            </div>
            <div className="header-right info">
                <img src={Logo} alt="logo" className={`${reversed ? "reversed" : ""}`}/>
            </div>
        </div>

    return (
        <div className="mod-login-container bottom">
            <div className="mod-login bottom">
                <h2>{I18n.t("landing.works")}</h2>
                {infoBlock("create", true, CreateLogo, true)}
                {infoBlock("invite", true, InviteLogo, false)}
                {infoBlock("join", false, JoinLogo, true)}
                {infoBlock("collaborate", false, CollaborateLogo, false)}
                <div className={"landing-footer"}>
                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`landing.footer`))}}/>
                </div>
            </div>
        </div>
    );
}