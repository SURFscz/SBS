import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./CreatableField.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";

export default function CreatableField({
                                           onChange,
                                           name,
                                           value,
                                           values = [],
                                           addValue,
                                           removeValue,
                                           toolTip = null,
                                           placeHolder = null,
                                           error = false,
                                           disabled = false
                                       }) {

    return (
        <div className={`creatable-field ${error ? "error" : ""}`}>
            <label htmlFor={name}>{name}
                {toolTip && <Tooltip tip={toolTip}/>}
            </label>
            <div className={`inner-creatable-field ${error ? "error" : ""}${disabled ? "disabled" : ""}`}>
                {values.map(val =>
                    <div key={val.name} className="creatable-tag">
                        <span>{val.name}</span>
                        {!disabled && <span onClick={removeValue(val)}>
                                            <FontAwesomeIcon icon="times"/>
                                        </span>}
                        {disabled && <span></span>}

                    </div>)}
                {!disabled && <textarea id="creatable-field" value={value} onChange={onChange} onBlur={addValue}
                                        onKeyDown={e => {
                                            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                                                addValue(e);
                                                setTimeout(() => document.getElementById("creatable-field").focus(), 50);
                                                return stopEvent(e);
                                            } else if (e.key === "Backspace" && isEmpty(value) && values.length > 0) {
                                                const val = values[values.length - 1];
                                                removeValue(val)();
                                            } else if (e.key === "Tab") {
                                                addValue(e);
                                            }
                                        }}
                                        placeholder={placeHolder} cols={1}/>}
            </div>
        </div>
    );
}
