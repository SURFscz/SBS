import React from "react";
import {stopEvent} from "../utils/Utils";
import "./Button.scss";

export default function Button({onClick, txt, disabled = false, cancelButton = false,
                                   warningButton = false, className = "", icon = null}) {
    const disable = disabled ? "disabled" : "";
    const cancel = cancelButton ? "cancel" : warningButton ? "orange" : "blue";
    const cn = `button ${disable} ${cancel} ${className}`;
    return (
        <a className={cn} href={`/${encodeURIComponent(txt)}`} onClick={e => {
            stopEvent(e);
            if (!disabled) {
                onClick();
            }
        }}>{txt}{icon}</a>
    );
}