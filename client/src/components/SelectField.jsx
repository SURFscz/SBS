import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./SelectField.scss";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import DOMPurify from "dompurify";

export default function SelectField({
                                        onChange, name, value, options, placeholder = "", disabled = false,
                                        toolTip = null, searchable = false, small = false,
                                        clearable = false, isMulti = false, creatable = false,
                                        onInputChange = null
                                    }) {
    return (
        <div className="select-field">
            <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(toolTip)}}/>
                </ReactTooltip>
            </span>}
            </label>
            {creatable &&
            <CreatableSelect
                className={`input-select-inner creatable`}
                classNamePrefix={"select-inner"}
                value={value}
                isMulti={true}
                placeholder={placeholder}
                isSearchable={true}
                onInputChange={onInputChange}
                isClearable={clearable}
                isDisabled={disabled}
                onChange={onChange}
                options={options}
            />}
            {!creatable && <Select
                className={`input-select-inner ${small ? " small" : ""}`}
                classNamePrefix={"select-inner"}
                value={value}
                placeholder={placeholder}
                isDisabled={disabled}
                onChange={onChange}
                isMulti={isMulti}
                options={options}
                isSearchable={searchable}
                isClearable={clearable}
            />}
        </div>
    );
}
