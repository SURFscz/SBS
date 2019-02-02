import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";
import {isEmpty} from "../utils/Utils";
import I18n from "i18n-js";

export default function InputField({
                                       onChange, name, value, placeholder = "", disabled = false,
                                       toolTip = null, onBlur = () => true, onEnter = null, multiline = false,
                                       fileUpload = false, fileName = null, onFileUpload = null, onFileRemoval = null,
                                       acceptFileFormat = "text/csv", fileInputKey = null
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
                   placeholder={placeholder}
                   className={`${fileUpload ? "file-upload" : ""}`}
                   onKeyDown={e => {
                       if (onEnter && e.keyCode === 13) {//enter
                           onEnter(e);
                       }
                   }}/>}
            {fileUpload && <section>
                <label className="file-upload" htmlFor={`fileUpload_${name}`}>
                    {isEmpty(fileName) ? I18n.t("inputField.fileImport") :
                        <span className="remove"><em>{fileName}</em><FontAwesomeIcon onClick={onFileRemoval}
                                                                                     icon="trash"/></span>}
                </label>
                <input key={fileInputKey}
                        type="file"
                       id={`fileUpload_${name}`}
                       name={`fileUpload_${name}`}
                       accept={acceptFileFormat}
                       style={{display: "none"}}
                       onChange={onFileUpload}/>
            </section>}

            {multiline &&
            <textarea disabled={disabled} value={value} onChange={onChange} onBlur={onBlur}
                      placeholder={placeholder}/>}
        </div>
    );
}
