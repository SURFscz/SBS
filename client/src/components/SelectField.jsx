import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./SelectField.scss";
import Select from "react-select";

export default function SelectField({
                                        onChange, name, value, options, placeholder = "", disabled = false,
                                        toolTip = null, searchable = false, className = "input-select-inner",
                                        classNamePrefix = "select-inner", clearable = false
                                    }) {
    return (
        <div className="select-field">
            <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
            </label>
            <Select
                className={className}
                classNamePrefix={classNamePrefix}
                value={value}
                placeholder={placeholder}
                isDisabled={disabled}
                onChange={onChange}
                options={options}
                isSearchable={searchable}
                isClearable={clearable}
            />
        </div>
    );
}
