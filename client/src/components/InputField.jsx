import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import "./InputField.scss";
import {isEmpty} from "../utils/Utils";
import I18n from "i18n-js";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function InputField({
                                       onChange, name, value, placeholder = "", disabled = false,
                                       toolTip = null, onBlur = () => true, onEnter = null, multiline = false,
                                       fileUpload = false, fileName = null, onFileUpload = null, onFileRemoval = null,
                                       acceptFileFormat = "text/csv", fileInputKey = null,
                                       copyClipBoard = false, link = null, externalLink = false, history = null
                                   }) {
    placeholder = disabled ? "" : placeholder;
    return (
        <div className="input-field">
            <label htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
            </label>
            {!multiline &&
            <input type="text"
                   disabled={disabled}
                   value={value || ""}
                   onChange={onChange}
                   onBlur={onBlur}
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
            {copyClipBoard && <CopyToClipboard text={value}>
                <section className="copy-to-clipboard">
                    <FontAwesomeIcon icon="copy" onClick={e => {
                        const me = e.target.parentElement;
                        me.classList.add("copied");
                        setTimeout(() => me.classList.remove("copied"), 1250);
                    }}/>

                </section>
            </CopyToClipboard>}
            {(link && history) && <FontAwesomeIcon icon="arrow-right" onClick={() => history.push(link)}/>}
            {externalLink && <a href={value} rel="noopener noreferrer" target="_blank"><FontAwesomeIcon icon="arrow-right"/></a>}
        </div>
    );
}
