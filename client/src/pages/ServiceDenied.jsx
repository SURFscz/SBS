import React, {useEffect, useState} from "react";
import "./ServiceDenied.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import service_denied from "../lotties/service-denied.json";
import I18n from "i18n-js";
import escape from "lodash.escape";

export default function ServiceDenied() {

    const [serviceName, setServiceName] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const name = urlSearchParams.get("service_name");
        const status = urlSearchParams.get("error_status");
        setServiceName(escape(name));
        setStatus(status);
    }, []);

    return (
        <div className="mod-service-denied">
            <div className="content">
                <h1 dangerouslySetInnerHTML={{__html: I18n.t("sfo.title", {name: serviceName})}}/>
                <Player
                    autoplay
                    loop
                    src={service_denied}
                    style={{height: "auto", width: "85px", "maxWidth": "85px"}}/>
                {<span dangerouslySetInnerHTML={{__html: I18n.t(`sfo.info${status}`, {name: serviceName})}}/>}
            </div>
        </div>
    );
}
