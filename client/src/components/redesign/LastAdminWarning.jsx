import React from "react";
import "./LastAdminWarning.scss";
import {ReactComponent as CriticalIcon} from "../../icons/critical.svg";
import I18n from "i18n-js";

export default function LastAdminWarning({organisation, currentUserDeleted = true, localePrefix = "collaborationDetail"}) {
    const msg = I18n.t(`${localePrefix}.${currentUserDeleted ? "lastAdminWarningUser" : "lastAdminWarning"}`,
        {name: organisation.name});
    return (
        <span className="last-admin-error-indication"><CriticalIcon/>
            <h2 dangerouslySetInnerHTML={{__html: msg}}/>
        </span>);

}