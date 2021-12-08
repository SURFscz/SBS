import React from "react";
import I18n from "i18n-js";
import "./CollaborationAupAcceptance.scss";
import "./welcome/welcome.scss";
import "react-mde/lib/styles/css/react-mde-all.css";
import CheckBox from "./CheckBox";
import Logo from "./redesign/Logo";
import {isEmpty} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function CollaborationAupAcceptance({
                                                       services,
                                                       disabled,
                                                       serviceEmails,
                                                       setDisabled,
                                                       children
                                                   }) {
    const renderContacts = service => {
        const hasEmails = !isEmpty(serviceEmails) && !isEmpty(serviceEmails[service.id]) ;
        const mails = encodeURI(serviceEmails[service.id].join(","));
        return (
            <td className="mails">
                {hasEmails &&
                <span>
                    <a href={`mailto:${mails}`} rel="noopener noreferrer">
                        <FontAwesomeIcon icon="envelope"/>
                    </a>
                </span>}
            </td>);
    }

    const renderServiceAup = service => {
        return (
            <div className="service-section" key={service.id}>
                <table>
                    <thead/>
                    <tbody>
                    <tr>
                        <td className="name">
                            <div className="name">
                                {service.logo && <Logo src={service.logo} alt={service.name}/>}
                                <span className="border-left">{service.name}</span>
                            </div>
                        </td>
                        <td className="aup">
                            {service.accepted_user_policy ?
                                <a href={service.accepted_user_policy} rel="noopener noreferrer"
                                   target="_blank">{I18n.t("service.accepted_user_policy")}</a> :
                                <span className="no-link">{I18n.t("aup.service.noAup")}</span>
                            }</td>
                        <td className="privacy_policy">
                            {service.privacy_policy ?
                                <a href={service.privacy_policy} rel="noopener noreferrer"
                                   target="_blank">{I18n.t("service.privacy_policy")}</a> :
                                <span className="no-link">{I18n.t("aup.service.noPrivacyPolicy")}</span>
                            }</td>
                       {renderContacts(service)}
                    </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="mod-aup-services">
            {children}
            <div className="services">
                {services.map(service => renderServiceAup(service))}
            </div>
            <div className="terms">
                <CheckBox name="aup" value={!disabled} info={I18n.t("aup.collaboration.agreeWithTerms")}
                          onChange={() => setDisabled(!disabled)}/>
            </div>
        </div>);

}

