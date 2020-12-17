import React from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import deadEnd from "../lotties/dead_end.json";

export default function DeadEnd() {
    return (
        <div className="mod-server-error">
            <Player
                autoplay
                loop
                src={deadEnd}
                style={{height: '600px', width: '600px'}}
            />
        </div>
    );
}