import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./InputField.scss";
import {isEmpty} from "../../utils/Utils";
import ClipBoardCopy from "../_redesign/clipboard-copy/ClipBoardCopy";
import {validUrlRegExp} from "../../validations/regExps";

export default function InputField({
                                       onChange,
                                       name,
                                       value,
                                       placeholder = "",
                                       disabled = false,
                                       toolTip = null,
                                       onBlur = () => true,
                                       onEnter = null,
                                       multiline = false,
                                       fileUpload = false,
                                       fileName = null,
                                       onFileUpload = null,
                                       acceptFileFormat = "text/csv",
                                       fileInputKey = null,
                                       copyClipBoard = false,
                                       link = null,
                                       externalLink = false,
                                       history = null,
                                       large = false,
                                       noInput = false,
                                       error = false,
                                       cols = 5,
                                       maxLength = 255,
                                       onRef = null,
                                       displayLabel = true,
                                       button = null,
                                       classNamePostFix = null,
                                       extraInfo = null,
                                       required = false
                                   }) {
    placeholder = disabled ? "" : placeholder;
    let className = "sds--text-field--input";
    if (error) {
        className += "error ";
    }
    if (classNamePostFix) {
        className += classNamePostFix;
    }
    const validExternalLink = externalLink && !isEmpty(value) && validUrlRegExp.test(value);
    return (
        <div
            className={`input-field sds--text-field ${error ? "sds--text-field--status-error" : ""} ${classNamePostFix ? classNamePostFix : ""}`}>
            {(name && displayLabel) && <label htmlFor={name}>{name}{required && <sup className="required">*</sup>}
                {toolTip && <Tooltip tip={toolTip}/>}
            </label>}
            {!isEmpty(fileName) && <em className="file-name">{fileName}</em>}
            {extraInfo && <span className="extra-info">{extraInfo}</span>}
            <div className="inner-input-field">
                {(!multiline && !noInput) &&
                    <input type="text"
                           disabled={disabled}
                           value={value || ""}
                           onChange={onChange}
                           onBlur={onBlur}
                           maxLength={maxLength}
                           ref={ref => onRef && onRef(ref)}
                           placeholder={placeholder}
                           className={`${className} sds--text-field--input`}
                           onKeyDown={e => {
                               if (onEnter && e.keyCode === 13) {//enter
                                   onEnter(e);
                               }
                           }}/>}
                {(multiline && !noInput) &&
                    <textarea disabled={disabled}
                              value={value}
                              onChange={onChange}
                              onBlur={onBlur}
                              className={`${className} sds--text-area ${large ? "large" : ""} ${fileUpload ? "file-upload" : ""}`}
                              onKeyDown={e => {
                                  if (onEnter && e.keyCode === 13) {//enter
                                      onEnter(e);
                                  }
                              }}
                              placeholder={placeholder} cols={cols}/>}
                {button && button}
                {copyClipBoard && <ClipBoardCopy txt={value} right={true}/>}
                {(link && history) && <div className="input-field-link"><FontAwesomeIcon icon="arrow-right"
                                                                                         onClick={() => history.push(link)}/>
                </div>}
                {validExternalLink &&
                    <div className={`input-field-link`}>
                        <a href={value} rel="noopener noreferrer" target="_blank">
                            <FontAwesomeIcon icon="arrow-right"/>
                        </a>
                    </div>}
                {noInput && <span className="no-input">{value}</span>}
                {fileUpload && <div className="file-upload-button-container">
                    <section className="file-upload-container">
                        <label className="file-upload" htmlFor={`fileUpload_${name}`}>
                            <span><FontAwesomeIcon icon="file-upload"/></span>
                        </label>
                        <input key={fileInputKey}
                               type="file"
                               id={`fileUpload_${name}`}
                               name={`fileUpload_${name}`}
                               accept={acceptFileFormat}
                               className={`${className} sds--text-field`}
                               style={{display: "none"}}
                               onChange={onFileUpload}/>
                    </section>
                </div>}
            </div>
        </div>
    );
}
