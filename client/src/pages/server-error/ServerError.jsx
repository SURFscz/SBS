import React from "react";
import "./ServerError.scss";
import Warning from "../../lotties/undraw_warning.svg?react";
import I18n from "../../locale/I18n";
import DOMPurify from "dompurify";
import {isEmpty} from "../../utils/Utils";

export default function ServerError() {

    const urlSearchParams = new URLSearchParams(window.location.search);
    const reason = urlSearchParams.get("reason");

    let error = I18n.t("error.message");
    let code = "";
    let message = "";

    const errorTranslation = I18n.translations[I18n.locale].error[reason];

    if (reason && errorTranslation) {
        error = errorTranslation;

        const samlCode = urlSearchParams.get("code");
        code = samlCode || I18n.t("error.defaultCode");

        const samlMsg = urlSearchParams.get("msg");
        message = samlMsg || I18n.t("error.defaultMessage");
    }

    return (
        <div className="mod-server-error">
            <div className="content">
                {<p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(error)}}/>}
                {!isEmpty(code) &&
                    <p className={"status"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(code)}}/>}
                {!isEmpty(message) &&
                    <p className={"status"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(message)}}/>}
                <Warning/>
            </div>
        </div>
    );
}
