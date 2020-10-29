import React from "react";
import "./ToggleSwitch.scss";

export default function ToggleSwitch({value, onChange, disabled = false}) {

    return (
        <label className="switch">
            <input type="checkbox" checked={value} disabled={true}/>
            <span className={`slider round ${value ? "checked" : ""} ${disabled ? "disabled" : ""}`}
                  onClick={() => !disabled && onChange(!value)}/>
        </label>
    )

}
