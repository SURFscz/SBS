import React from "react";
import "./ErrorIndicator.scss";
import {ReactComponent as CriticalIcon} from "../../icons/critical.svg";

export default function ErrorIndicator({msg, standalone = false, decode = true}) {
    const className = `error-indication ${standalone ? "standalone" : ""}`;
    return decode ? <span className={className}><CriticalIcon/>{msg}</span> :
        <span className={className}><CriticalIcon/><span dangerouslySetInnerHTML={{__html: msg}}/></span>
}