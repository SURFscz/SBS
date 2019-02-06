import React from "react";
import I18n from "i18n-js";
import "./ServerError.scss";

export default function ServerError() {
    return (
        <div className="mod-server-error">
            <div className="title">
                <p dangerouslySetInnerHTML={{__html: I18n.t("error_dialog.title")}}/>
            </div>
            <div className="content">
                <p>{I18n.t("error_dialog.body")}</p>
            </div>
        </div>
    );
}