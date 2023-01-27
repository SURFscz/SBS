import React from "react";
import "./RadioButton.scss";
import I18n from "i18n-js";
import {Tooltip} from "@surfnet/sds";

export default function RadioButton({label, name, value, onChange, tooltip, disabled = false, tooltipOnHover = false}) {

    const internalOnChange = () => {
        onChange(!value);
    }

    return (
        <div className="radio-button-container">
            <label className="info">{label}
                {tooltip && <Tooltip tip={tooltip}/>}
            </label>
            <div className="r-buttons">
                {["yes", "no"].map(s => {
                    const id = `${name}-${s}`;
                    const disabledClassName = disabled ? "disabled" : "";
                    return <div key={id} className={`r-button ${disabledClassName}`} data-tip data-for={`${name}_${s}`}>
                        <input type="radio" id={id} name={id}
                               onChange={internalOnChange} checked={s === "yes" ? value : !value} disabled={disabled}/>
                        <label className={`checkmark ${disabledClassName}`} htmlFor={id}/>
                        <label className={`value ${disabledClassName}`} htmlFor={id}>{I18n.t(`forms.${s}`)}</label>
                        {(tooltipOnHover && s === "yes" && disabled) &&
                        <Tooltip tip={tooltip}/>
                        }
                    </div>
                })}
            </div>
        </div>
    )
}
