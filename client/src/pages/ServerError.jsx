import React from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import error from "../lotties/error.json";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";

export default function ServerError() {
    return (
        <div className="mod-server-error">
            <div className="content">
                {<p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("error.message"))}}/>}
                <Player
                    autoplay
                    loop
                    src={error}
                    style={{height: "auto", width: "100vw", "maxWidth": "900px"}}/>
            </div>
        </div>
    );
}