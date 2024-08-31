import React from "react";
import "./ErrorIndicator.scss";
import {ReactComponent as CriticalIcon} from "../../icons/critical.svg";
import DOMPurify from "dompurify";

export default function ErrorIndicator({
                                           msg,
                                           standalone = false,
                                           decode = true,
                                           subMsg = null
                                       }) {
    const className = `error-indication ${standalone ? "standalone" : ""}`;
    msg = msg.replaceAll("?", "");
    return decode ?
        <span className={className}>
            <CriticalIcon/>{msg}
            {subMsg && <span className={"error-message sub-msg"}>{subMsg}</span>}
        </span> :
        <span className={className}>
            <CriticalIcon/>
            <span className={"error-message"}
                  dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(msg, {ADD_ATTR: ['target']})}}/>
            {subMsg && <span className={"error-message sub-msg"}>{subMsg}</span>}
        </span>
}