import React, {useEffect, useState} from "react";
import "./ServerError.scss";
import {Player} from "@lottiefiles/react-lottie-player";
import errorJson from "../lotties/error.json";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";
import {isEmpty} from "../utils/Utils";

export default function ServerError() {

    const [error, setError] = useState(I18n.t("error.message"));
    const [code, setCode] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const reason = urlSearchParams.get("reason");
        const errorTranslation = I18n.translations[I18n.locale].error[reason];
        if (reason && errorTranslation) {
            setError(errorTranslation);
            const samlCode = urlSearchParams.get("code");
            if (samlCode) {
                setCode(samlCode);
            } else {
                setCode(I18n.t("error.defaultCode"));
            }
            const samlMsg = urlSearchParams.get("msg");
            if (samlMsg) {
                setMessage(samlMsg);
            } else {
                setMessage(I18n.t("error.defaultMessage"));
            }
        }
    }, [])

    return (
        <div className="mod-server-error">
            <div className="content">
                {<p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(error)}}/>}
                {!isEmpty(code) &&
                <p className={"status"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(code)}}/>}
                {!isEmpty(message) &&
                <p className={"status"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(message)}}/>}
                <Player
                    autoplay
                    loop
                    src={errorJson}
                    style={{height: "auto", width: "100vw", "maxWidth": "900px"}}/>
            </div>
        </div>
    );
}