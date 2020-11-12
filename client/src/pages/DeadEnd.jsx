import React from "react";
import I18n from "i18n-js";
import "./ServerError.scss";
import {Browser} from 'react-kawaii'

export default function DeadEnd() {
    return (
        <div className="mod-server-error">
            <div className="title">
                <p>{I18n.t("error_dialog.deadEnd")}</p>
            </div>
            <div className="content">
                <Browser size={160} mood="sad" color="#fbfbfb" />
            </div>
        </div>
    );
}