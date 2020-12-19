import React from "react";
import "./ErrorIndicator.scss";
import {ReactComponent as CriticalIcon} from "../../icons/critical.svg";

export default function ErrorIndicator({msg, standalone = false}) {
    const className = `error-indication ${standalone ? "standalone" : ""}`;
    return <span className={className}><CriticalIcon/>{msg}</span>
}