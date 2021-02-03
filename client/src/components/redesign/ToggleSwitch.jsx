import React from "react";
import "./ToggleSwitch.scss";
import ReactTooltip from "react-tooltip";
import {pseudoGuid} from "../../utils/Utils";

export default function ToggleSwitch({value, onChange, disabled = false, animate = true, tooltip = undefined}) {
    const id = pseudoGuid();
    return (
        <label className="switch" data-tip data-for={id}>
            <input type="checkbox" checked={value} disabled={true}/>
            <span className={`slider round ${value ? "checked" : ""} ${disabled ? "disabled" : ""} ${animate ? "" : "no-animation"}`}
                  onClick={() => !disabled && onChange(!value)}/>
            {tooltip && <ReactTooltip id={id} type="light" effect="solid" data-html={true}>
                <span className="tooltip-wrapper-inner" dangerouslySetInnerHTML={{__html: tooltip}}/>
            </ReactTooltip>}
        </label>
    )

}
