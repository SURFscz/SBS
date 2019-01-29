import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";

export default function InputField({
                                       onChange, name, value, placeholder = "", disabled = false,
                                       toolTip = null, onBlur = () => true, onEnter = null, multiline= false
                                   }) {
    return (
        <div className="input-field">
            <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="question-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
            </label>
            {!multiline &&
            <input type="text" disabled={disabled} value={value || ""} onChange={onChange} onBlur={onBlur}
                   placeholder={placeholder} onKeyDown={e => {
                if (onEnter && e.keyCode === 13) {//enter
                    onEnter(e);
                }
            }}/>}
            {multiline &&
            <textarea disabled={disabled} value={value} onChange={onChange} onBlur={onBlur}
                   placeholder={placeholder} />}
        </div>
    );
}
