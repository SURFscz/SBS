import React from "react";
import I18n from "../locale/I18n";
import "./CollaborationAupAcceptance.scss";
import "./welcome/welcome.scss";
import CheckBox from "./CheckBox";
import Logo from "./redesign/Logo";
import {isEmpty} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function CollaborationAupAcceptance({
                                                       services,
                                                       disabled,
                                                       serviceEmails,
                                                       setDisabled,
                                                       allServiceAupsAgreedOn,
                                                       children
                                                   }) {
    const renderServiceAup = service => {
        const hasEmails = !isEmpty(serviceEmails) && !isEmpty(serviceEmails[service.id]);
        const mails = hasEmails ? encodeURI(serviceEmails[service.id].join(",")) : null;

        return (
            <div className="service-section" key={service.id}>
                <table>
                    <thead/>
                    <tbody>
                    <tr>
                        <td className="logo">
                            {service.logo && <Logo src={service.logo} alt={service.name}/>}
                        </td>
                        <td className="service-detail">
                            <div className="service">
                                <span className="service-name">{service.name}</span>
                                <div className="policies">
                                    <div className="policy">
                                        {service.accepted_user_policy ?
                                            <a href={service.accepted_user_policy}
                                               rel="noopener noreferrer"
                                               target="_blank">{I18n.t("service.accepted_user_policy")}</a> :
                                            <span className="no-link">{I18n.t("aup.service.noAup")}</span>
                                        }
                                    </div>
                                    <div className="policy">
                                        {service.privacy_policy ?
                                            <a href={service.privacy_policy}
                                               rel="noopener noreferrer"
                                               target="_blank">{I18n.t("service.privacy_policy")}</a> :
                                            <span className="no-link">{I18n.t("aup.service.noPrivacyPolicy")}</span>
                                        }
                                    </div>
                                    <div className="policy contact">
                                        {mails ? <a href={`mailto:${mails}`} rel="noopener noreferrer">
                                            <FontAwesomeIcon
                                                icon="envelope"/><span>{I18n.t("aup.service.contact")}</span>
                                        </a> : <span className="no-link">{I18n.t("aup.service.noContact")}</span>}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        );
    }
    const servicesWithAups = services.filter(service => !isEmpty(service.accepted_user_policy));
    const singleServiceWithAup = servicesWithAups.length === 1;
    return (
        <div className="mod-aup-services">
            {children}
            {services.length > 0 && <div className="services">
                {services.map(service => renderServiceAup(service))}
            </div>}
            {services.length === 0 && <div className="services">
                <span>{I18n.t("welcomeDialog.noServices")}</span>
            </div>}
            {(servicesWithAups.length > 0 && !allServiceAupsAgreedOn) &&
                <div className="terms">
                    <p className="aup-info">
                        {I18n.t(`aup.service.${singleServiceWithAup ? "singleInfo" : "multipleInfo"}`)}
                    </p>
                    <CheckBox name="aup"
                              value={!disabled}
                              info={I18n.t(`aup.service.${singleServiceWithAup ? "singleCheck" : "multipleCheck"}`)}
                              onChange={() => setDisabled(!disabled)}/>
                </div>}

            {(servicesWithAups.length > 0 && allServiceAupsAgreedOn) &&
                <div className="terms">
                    <p className="aup-info">
                        {I18n.t(`aup.service.${singleServiceWithAup ? "singleInfoAccepted" : "multipleInfoAccepted"}`)}
                    </p>
                </div>}
        </div>);

}
