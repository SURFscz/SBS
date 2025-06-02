import React from "react";
import {stopEvent} from "../../utils/Utils";
import {Button as SDSButton, ButtonSize, ButtonType} from "@surfnet/sds";
import "./Button.scss";

export default function Button({
                                   onClick, txt, disabled = false, cancelButton = false,
                                   warningButton = false, icon = null, small = false,
                                   centralize = false, className = ""
                               }) {

    const onClickInternal = e => {
        stopEvent(e);
        if (!disabled) {
            onClick();
        }
    }
    const buttonType = cancelButton ? ButtonType.Secondary : warningButton ?
        txt ? ButtonType.DestructiveSecondary : ButtonType.Delete : className.indexOf("ghost") > -1 ? ButtonType.GhostDark :
            className.indexOf("tertiary") > -1 ? ButtonType.Tertiary : ButtonType.Primary;
    const buttonSize = small ? ButtonSize.Small : centralize ? ButtonSize.Full : ButtonSize.Default;
    return <SDSButton txt={txt}
                      onClick={onClickInternal}
                      disabled={disabled}
                      centralize={centralize}
                      icon={icon}
                      size={buttonSize}
                      type={buttonType}/>

}
