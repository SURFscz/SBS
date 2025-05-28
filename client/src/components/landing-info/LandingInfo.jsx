import React from "react";
import DOMPurify from "dompurify";
import I18n from "../../locale/I18n";
import CreateLogo from "../../icons/landing/sketch.svg";
import InviteLogo from "../../icons/landing/mail.svg";
import JoinLogo from "../../icons/landing/screen.svg";
import CollaborateLogo from "../../icons/landing/collaborate.svg";
import "./LandingInfo.scss";
import {Chip, ChipType} from "@surfnet/sds"

export default function LandingInfo() {
    const infoBlock = (name, isAdminFunction, Logo, reversed) =>
        <div key={name} className={`mod-login info ${reversed ? "reversed" : ""}`}>
            <div className="header-left info">
                <div className={"info-title"}>
                    <h2>{I18n.t(`landing.${name}`)}</h2>
                    {isAdminFunction && <div className={"admin-function-container"}>
                        <Chip label={I18n.t("landing.adminFunction")} type={ChipType.Main_400}/>
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
                <h1>{I18n.t("landing.works")}</h1>
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
