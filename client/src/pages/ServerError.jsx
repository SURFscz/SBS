import React from "react";
import I18n from "i18n-js";
import "./ServerError.scss";
import {Ghost} from 'react-kawaii'

export default function ServerError() {
    return (
        <div className="mod-server-error">
            <div className="title">
                <p>{I18n.t("error_dialog.body")}</p>
            </div>
            <div className="content">
                <Ghost size={160} mood="ko" color="#fbfbfb" />
            </div>
        </div>
    );
}