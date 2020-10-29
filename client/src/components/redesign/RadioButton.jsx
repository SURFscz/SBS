import React from "react";
import "./RadioButton.scss";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";

export default function RadioButton({label, name, value, onChange, tooltip, disabled = false}) {

    const internalOnChange = () => {
        onChange(!value);
    }

    return (
        <div className="radio-button-container">
            <label className="info">{label} {tooltip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: tooltip}}/>
                </ReactTooltip>
            </span>}</label>
            <div className="r-buttons">
                {["yes", "no"].map(s => {
                    const id = `${name}-${s}`;
                    const disabledClassName = disabled ? "disabled" : "";
                    return <div key={id} className={`r-button ${disabledClassName}`}>
                        <input type="radio" id={id} name={id}
                               onChange={internalOnChange} checked={s === "yes" ? value : !value} disabled={disabled}/>
                        <label className={`checkmark ${disabledClassName}`} htmlFor={id}/>
                        <label className={`value ${disabledClassName}`} htmlFor={id}>{I18n.t(`forms.${s}`)}</label>
                    </div>
                })}
            </div>
        </div>
    )
}
