import React from "react";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import "./BackLink.scss";

export default function BackLink({history}) {
    return <div className="back-link">
        <a href={`/back`} onClick={e => {
            stopEvent(e);
            history.goBack();
        }}><FontAwesomeIcon icon="arrow-left"/>
            {I18n.t("forms.back")}
        </a>
    </div>;
}