import React from "react";
import I18n from "i18n-js";
import "./NotFound.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Planet} from 'react-kawaii'
import {login} from "../utils/Login";

export default function NotFound({currentUser}) {
    return (
        <div className="mod-not-found">
            <div className="title">
                <p dangerouslySetInnerHTML={{__html: I18n.t("not_found.description_html")}}/>
                {currentUser.guest && <a href="/login" onClick={login}>
                    <FontAwesomeIcon icon="arrow-right"/>{I18n.t("not_found.loginLink")}
                </a>}
            </div>
            <div className="content">
                <Planet size={80} mood="sad" color="white"/>
                <p className="hero">{I18n.t("not_found.title")}</p>
            </div>
        </div>
    );

}
