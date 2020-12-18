import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";
import {isEmpty} from "../utils/Utils";
import ClipBoardCopy from "./redesign/ClipBoardCopy";

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
                                       acceptFileFormat = "text/csv",
                                       fileInputKey = null,
                                       copyClipBoard = false,
                                       link = null,
                                       externalLink = false,
                                       history = null,
                                       large = false,
                                       noInput = false,
                                       error = false
                                   }) {
    placeholder = disabled ? "" : placeholder;
    let className = `${fileUpload ? "file-upload" : ""}`;
    if (error) {
        className += "error ";
    }
    return (
        <div className="input-field">
            {name && <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
            </label>}
            <div className="inner-input-field">
                {(!multiline && !noInput) &&
                <input type="text"
                       disabled={disabled}
                       value={value || ""}
                       onChange={onChange}
                       onBlur={onBlur}
                       placeholder={placeholder}
                       className={className}
                       onKeyDown={e => {
                           if (onEnter && e.keyCode === 13) {//enter
                               onEnter(e);
                           }
                       }}/>}
                {fileUpload && <section className="file-upload-container">
                    <label className="file-upload" htmlFor={`fileUpload_${name}`}>
                        {isEmpty(fileName) ? <span><FontAwesomeIcon icon="file-upload"/></span> :
                            <span className="remove"><em>{fileName}</em>
                            <FontAwesomeIcon onClick={onFileRemoval} icon="trash"/></span>}
                    </label>
                    <input key={fileInputKey}
                           type="file"
                           id={`fileUpload_${name}`}
                           name={`fileUpload_${name}`}
                           accept={acceptFileFormat}
                           style={{display: "none"}}
                           onChange={onFileUpload}/>
                </section>}
                {(multiline && !noInput) &&
                <textarea disabled={disabled} value={value} onChange={onChange} onBlur={onBlur}
                          className={`${className} ${large ? "large" : ""}`}
                          onKeyDown={e => {
                              if (onEnter && e.keyCode === 13) {//enter
                                  onEnter(e);
                              }
                          }}
                          placeholder={placeholder} cols={3}/>}
                {copyClipBoard && <ClipBoardCopy txt={value} right={true}/>}
                {(link && history) && <div className="input-field-link"><FontAwesomeIcon icon="arrow-right"
                                                                                         onClick={() => history.push(link)}/>
                </div>}
                {(externalLink && value) &&
                <div className="input-field-link"><a href={value} rel="noopener noreferrer"
                                                     target="_blank"><FontAwesomeIcon icon="arrow-right"/></a></div>}
                {noInput && <span className="no-input">{value}</span>}
            </div>
        </div>
    );
}
