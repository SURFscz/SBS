import React from "react";
import {stopEvent} from "../utils/Utils";
import "./Button.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function Button({
                                   onClick, txt, disabled = false, cancelButton = false,
                                   warningButton = false, className = "", icon = null, small = false,
                                   html = null
                               }) {
    const disable = disabled ? "disabled" : "";
    const cancel = cancelButton ? "cancel" : warningButton ? "delete" : "blue";
    const smallButton = small ? "small" : "";
    const cn = `button ${disable} ${cancel} ${className} ${smallButton}`;
    const onClickInternal = e => {
                stopEvent(e);
                if (!disabled) {
                    onClick();
                }
    }
    icon = warningButton ? <FontAwesomeIcon icon="trash"/> : icon;
    if (html) {
        return (
            <a className={cn} href={`/${encodeURIComponent(txt)}`} onClick={onClickInternal}>
            <span dangerouslySetInnerHTML={{
                   __html: html
               }}></span>
            </a>
        );
    }
    return (
        <a className={cn} href={`/${encodeURIComponent(txt)}`} onClick={onClickInternal}>
            {!warningButton && txt}{icon}
        </a>
    );
}