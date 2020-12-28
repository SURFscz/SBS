import React from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import deadEnd from "../lotties/dead_end.json";

export default function DeadEnd() {
    return (
        <div className="mod-server-error">
            <div className="content">
            <Player
                autoplay
                loop
                src={deadEnd}
                style={{height: "auto", width: "100vw", "max-width": "900px"}}/>
            </div>
        </div>
    );
}