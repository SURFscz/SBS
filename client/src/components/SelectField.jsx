import React from "react";

import "./SelectField.scss";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {Tooltip} from "@surfnet/sds";
import ClipBoardCopy from "./redesign/ClipBoardCopy";
import {isEmpty} from "../utils/Utils";

export default function SelectField({
                                        onChange, name, value, options, placeholder = "", disabled = false,
                                        toolTip = null, searchable = false, small = false,
                                        clearable = false, isMulti = false, creatable = false,
                                        onInputChange = null, copyClipBoard = false,
                                    }) {
    return (
        <div className="select-field">
            <label htmlFor={name}>{name}
                {toolTip && <Tooltip tip={toolTip}/>}
            </label>
            <div className="select-field-inner">
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
            {copyClipBoard && <ClipBoardCopy
                txt={isEmpty(value) ? "" : Array.isArray(value) ? value.map(v => v.label).join(", ") : value}
                right={true}/>}
            </div>
        </div>
    );
}
