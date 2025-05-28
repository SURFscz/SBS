import React from "react";
import I18n from "../../locale/I18n";
import "./OrganisationAupAcceptance.scss";
import "../_welcome/welcome.scss";
import Logo from "../_redesign/Logo";
import {isEmpty} from "../../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import CheckBox from "../checkbox/CheckBox";
import DOMPurify from "dompurify";

export default function OrganisationAupAcceptance({
                                                      adminEmails,
                                                      setDisabled,
                                                      disabled,
                                                      organisation
                                                  }) {
    const renderOrganisationAup = organisation => {
        const mails = encodeURI(adminEmails.join(","));
        return (
            <div className="organisation-section" key={organisation.id}>
                <table>
                    <thead/>
                    <tbody>
                    <tr>
                        <td className="logo">
                            {organisation.logo && <Logo src={organisation.logo} alt={organisation.name}/>}
                        </td>
                        <td className="organisation-detail">
                            <div className="organisation">
                                <span className="organisation-name">{organisation.name}</span>
                                <div className="policies">
                                    <div className="border-right">
                                        {organisation.accepted_user_policy ?
                                            <a href={organisation.accepted_user_policy}
                                               rel="noopener noreferrer"
                                               target="_blank">{I18n.t("service.accepted_user_policy")}</a> :
                                            <span className="no-link">{I18n.t("aup.service.noAup")}</span>
                                        }
                                    </div>
                                    <div className="contact">
                                        {!isEmpty(mails) && <a href={`mailto:${mails}`} rel="noopener noreferrer">
                                            <FontAwesomeIcon
                                                icon="envelope"/><span>{I18n.t("aup.service.contact")}</span>
                                        </a>}
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
    return (
        <div className="mod-aup-organisation">
            <h4 className="aup-services">
                {I18n.t("aup.organisation.title")}
            </h4>
            <p className="aup-info"
               dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("aup.organisation.info", {name: organisation.name}))}}/>
            <p >
            </p>
            {renderOrganisationAup(organisation)}
            <div className="terms">
                <CheckBox name="aup-organisation"
                          value={!disabled}
                          info={I18n.t("aup.organisation.check")}
                          onChange={() => setDisabled(!disabled)}/>
            </div>
        </div>);

}
