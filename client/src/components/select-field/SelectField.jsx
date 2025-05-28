import React from "react";

import "./SelectField.scss";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {Tooltip} from "@surfnet/sds";
import ClipBoardCopy from "../_redesign/ClipBoardCopy";
import {isEmpty} from "../../utils/Utils";

export default function SelectField({
                                        onChange,
                                        name,
                                        value,
                                        options,
                                        placeholder = "",
                                        disabled = false,
                                        toolTip = null,
                                        searchable = false,
                                        small = false,
                                        clearable = false,
                                        isMulti = false,
                                        creatable = false,
                                        onInputChange = null,
                                        copyClipBoard = false,
                                        isOptionDisabled = () => false,
                                        required = false,
                                        error = false
                                    }) {
    const styles = {
        multiValue: (base, state) => state.data.isFixed ? {
            ...base,
            backgroundColor: 'var(--sds--color--gray--200)!important'
        } : base,
        multiValueRemove: (base, state) => state.data.isFixed ? {...base, display: 'none'} : base
    };
    return (
        <div className="select-field">
            <label htmlFor={name}>{name}{required && <sup className="required">*</sup>}
                {toolTip && <Tooltip tip={toolTip}/>}
            </label>
            <div className="select-field-inner">
                {creatable &&
                    <CreatableSelect
                        className={`input-select-inner creatable ${error ? "error" : ""}`}
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
                {!creatable &&
                    <Select
                        className={`input-select-inner ${small ? " small" : ""}  ${error ? "error" : ""}`}
                        classNamePrefix={"select-inner"}
                        value={value}
                        placeholder={placeholder}
                        isDisabled={disabled}
                        onChange={onChange}
                        styles={isMulti ? styles : undefined}
                        isMulti={isMulti}
                        options={options}
                        isSearchable={searchable}
                        isClearable={clearable}
                        isOptionDisabled={isOptionDisabled}
                    />}
                {copyClipBoard && <ClipBoardCopy
                    txt={isEmpty(value) ? "" : Array.isArray(value) ? value.map(v => v.label).join(", ") : value}
                    right={true}/>}
            </div>
        </div>
    );
}
