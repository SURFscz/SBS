import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";

export default function InputField({onChange, name, value, placeholder = "", disabled=false, toolTip = null}) {
    return (
        <div className="input-field">
            <label htmlFor={name}> {name}</label>
            <input type="text"  disabled={disabled} value={value} onChange={onChange} placeholder={placeholder}/>
            {toolTip &&
            <section>
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="info" effect="solid">
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </section>}
        </div>
    );
}
