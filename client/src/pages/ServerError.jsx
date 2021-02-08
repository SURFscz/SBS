import React from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import error from "../lotties/error.json";

export default function ServerError() {
    return (
        <div className="mod-server-error">
            <div className="content">
                <Player
                    autoplay
                    loop
                    src={error}
                    style={{height: "auto", width: "100vw", "maxWidth": "900px"}}/>
            </div>
        </div>
    );
}