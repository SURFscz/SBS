import React from "react";
import "./NotFound.scss";
import {Player} from '@lottiefiles/react-lottie-player';
import notFound from "../lotties/not_found.json"


export default function NotFound({}) {
    return (
        <div className="mod-not-found">
            <Player
                autoplay
                loop
                src={notFound}
                style={{height: "auto", width: "100vw", "max-width": "900px"}}/>
        </div>
    );

}
