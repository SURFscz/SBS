import React from "react";
import I18n from "i18n-js";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import "./ImageField.scss";

export default function ImageField({title, name, onChange, value}) {

    const internalOnChange = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = evt => {
                const s = btoa(evt.target.result);
                onChange(s);
            }
            reader.readAsBinaryString(files[0]);
        }
    }

    return (
        <div className="image-field">
            <label className="info" htmlFor="">{title}</label>
            <section className="file-upload">
                {!value && <div className="no-image">
                    {!value && <NotFoundIcon/>}
                </div>}
                {value && <div className="preview">
                    <img src={`data:image/jpeg;base64,${value}`}/>
                </div>}
                <label className="file-upload-label button" htmlFor={`fileUpload_${name}`}>
                    {I18n.t("forms.upload")}
                </label>
                <input name={name}
                       type="file"
                       id={`fileUpload_${name}`}
                       name={`fileUpload_${name}`}
                       accept="image/png, image/jpeg, image/jpg"
                       style={{display: "none"}}
                       onChange={internalOnChange}/>
            </section>
            <span className="disclaimer">{I18n.t("forms.image")}</span>
        </div>
    );
}
