import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";
import {isEmpty} from "../utils/Utils";
import ClipBoardCopy from "./redesign/ClipBoardCopy";
import {validUrlRegExp} from "../validations/regExps";
import DOMPurify from "dompurify";

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
                                       onFileRemoval = null,
                                       onFileInitialRemoval = null,
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
                                       displayLabel = true
                                   }) {
    placeholder = disabled ? "" : placeholder;
    let className = `${fileUpload ? "file-upload" : ""}`;
    if (error) {
        className += "error ";
    }
    const validExternalLink = externalLink && !isEmpty(value) && validUrlRegExp.test(value);
    return (
        <div className="input-field">
            {(name && displayLabel) && <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}
                              className={"sds--tooltip"}>
                    <span className="sds--tooltip--textual sds--text--body--small"
                          dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(toolTip)}}/>
                </ReactTooltip>
            </span>}
            </label>}
            {!isEmpty(fileName) && <em className="file-name">{fileName}</em>}
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
                       className={className}
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
                          className={`${className} ${large ? "large" : ""} ${fileUpload ? "file-upload" : ""}`}
                          onKeyDown={e => {
                              if (onEnter && e.keyCode === 13) {//enter
                                  onEnter(e);
                              }
                          }}
                          placeholder={placeholder} cols={cols}/>}

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
                               style={{display: "none"}}
                               onChange={onFileUpload}/>
                    </section>
                    {onFileInitialRemoval &&
                    <section className={"on-file-initial-removal"} onClick={onFileRemoval}>
                        <span><FontAwesomeIcon icon="trash"/></span>
                    </section>}
                </div>}
            </div>
        </div>
    );
}
