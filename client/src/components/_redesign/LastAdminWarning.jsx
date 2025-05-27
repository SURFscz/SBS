import React from "react";
import "./LastAdminWarning.scss";
import I18n from "../../locale/I18n";
import DOMPurify from "dompurify";

export default function LastAdminWarning({
                                             organisation,
                                             currentUserDeleted = true,
                                             localePrefix = "collaborationDetail"
                                         }) {
    const msg = I18n.t(`${localePrefix}.${currentUserDeleted ? "lastAdminWarningUser" : "lastAdminWarning"}`,
        {name: organisation.name});
    return (
        <p className="last-admin-error-indication">
            <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(msg)}}/>
        </p>);

}