import React from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import error from "../lotties/error.json";

export default function ServerError() {
    return (
        <div className="mod-server-error">
            <Player
                autoplay
                loop
                src={error}
                style={{height: '600px', width: '600px'}}
            />
        </div>
    );
}