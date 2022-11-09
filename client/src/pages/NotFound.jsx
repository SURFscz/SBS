import React from "react";
import "./NotFound.scss";
import {Player} from '@lottiefiles/react-lottie-player';
import notFound from "../lotties/not_found.json"
import I18n from "i18n-js";
import DOMPurify from "dompurify";

export default function NotFound({config}) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const errorMessage = urlSearchParams.get("eo") || "msg";
    const html = DOMPurify.sanitize(I18n.t(`notFound.${errorMessage}`, {base_url: config.base_url}));
    return (
        <div className="mod-not-found">
            <p className="not-found-msg" dangerouslySetInnerHTML={{__html: html}}/>
            <Player
                autoplay
                loop
                src={notFound}
                style={{height: "auto", width: "100vw", "maxWidth": "900px"}}/>
        </div>
    );
}
