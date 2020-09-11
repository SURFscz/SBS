import React from "react";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import "./BackLink.scss";

export default function BackLink({history, fullAccess, limitedAccess, role}) {
    return <div className="back-link">
        <a href={`/back`} onClick={e => {
            stopEvent(e);
            history.goBack();
        }}><FontAwesomeIcon icon="arrow-left"/>
            {I18n.t("forms.back")}
        </a>
        {role && <span className="access">
            {(fullAccess || limitedAccess) && <FontAwesomeIcon icon="lock-open"/>}
            {!(fullAccess || limitedAccess) && <FontAwesomeIcon icon="lock"/>}
            {I18n.t("access.info", {access: I18n.t(`access.${limitedAccess ? "limited" : fullAccess ? "full" : "readOnly"}`)  , role})}
        </span>}
    </div>;
}