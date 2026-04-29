import React from "react";
import "./SAMLMetaData.scss";
import I18n from "../../locale/I18n";
import {isEmpty} from "../../utils/Utils";

export const SAMLMetaData = ({parsedSAMLMetaData}) => {

    return (
        <div className="parsed-saml-meta-data first-column">
            <table>
                <thead/>
                <tbody>
                <tr>
                    <td className="attribute">{I18n.t("service.samlMetaData.acs_binding")}</td>
                    <td className="value">{parsedSAMLMetaData.acs_binding || I18n.t("service.samlMetaData.unknown")}</td>
                </tr>
                <tr>
                    <td className="attribute">{I18n.t("service.samlMetaData.acs_location")}</td>
                    <td className="value">{parsedSAMLMetaData.acs_location || I18n.t("service.samlMetaData.unknown")}</td>
                </tr>
                <tr>
                    <td className="attribute">{I18n.t("service.samlMetaData.entity_id")}</td>
                    <td className="value">{parsedSAMLMetaData.entity_id || I18n.t("service.samlMetaData.unknown")}</td>
                </tr>
                {!isEmpty(parsedSAMLMetaData.organization_name) && <tr>
                    <td className="attribute">{I18n.t("service.samlMetaData.organization_name")}</td>
                    <td className="value">{parsedSAMLMetaData.organization_name}</td>
                </tr>}
                </tbody>
            </table>
        </div>)
}
