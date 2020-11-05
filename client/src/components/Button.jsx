import React from "react";
import {stopEvent} from "../utils/Utils";
import "./Button.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function Button({onClick, txt, disabled = false, cancelButton = false,
                                   warningButton = false, className = "", icon = null}) {
    const disable = disabled ? "disabled" : "";
    const cancel = cancelButton ? "cancel" : warningButton ? "delete" : "blue";
    const cn = `button ${disable} ${cancel} ${className}`;
    icon = warningButton ? <FontAwesomeIcon icon="trash"/> : icon;
    return (
        <a className={cn} href={`/${encodeURIComponent(txt)}`} onClick={e => {
            stopEvent(e);
            if (!disabled) {
                onClick();
            }
        }}>{!warningButton && txt}{icon}</a>
    );
}