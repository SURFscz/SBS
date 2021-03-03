import React from "react";
import "./NotFound.scss";
import {Player} from '@lottiefiles/react-lottie-player';
import notFound from "../lotties/not_found.json"
import I18n from "i18n-js";

export default function NotFound({config}) {
    return (
        <div className="mod-not-found">
            <p className="not-found-msg" dangerouslySetInnerHTML={{__html: I18n.t("notFound.msg", {base_url: config.base_url})}}/>
            <Player
                autoplay
                loop
                src={notFound}
                style={{height: "auto", width: "100vw", "maxWidth": "900px"}}/>
        </div>
    );

}
