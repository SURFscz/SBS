import React from "react";
import I18n from "i18n-js";
import "./NotFound.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import {getParameterByName} from "../utils/QueryParameters";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import { Planet } from 'react-kawaii'

export default function NotFound({currentUser}) {
    return (
        <div className="mod-not-found">
            <div className="title">
                <p dangerouslySetInnerHTML={{__html: I18n.t("not_found.description_html")}}/>
                {currentUser.guest && <a href="/login" onClick={e => {
                    stopEvent(e);
                    const state = getParameterByName("state", window.location.search);
                    window.location.href = isEmpty(state) ? "/login" : `/login?state=${encodeURIComponent(state)}`;
                }}><FontAwesomeIcon icon="arrow-left"/>{I18n.t("not_found.loginLink")}</a>}
            </div>
            <div className="content">
                <Planet size={80} mood="sad" color="white" />
                <p className="hero">{I18n.t("not_found.title")}</p>
            </div>
        </div>
    );

}
