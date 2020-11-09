import React, { useState } from "react";
import I18n from "i18n-js";
import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";
import "./ImageField.scss";
import {isEmpty} from "../../utils/Utils";

export default function ImageField({title, name, onChange, value, secondRow = false, initial = true}) {

    const [error, setError] = useState("");

    const internalOnChange = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 512 * 1000) {
                setError(I18n.t("forms.imageToLarge"));
            } else {
                const reader = new FileReader();
                reader.onload = evt => onChange(btoa(evt.target.result));
                reader.readAsBinaryString(files[0]);
            }
        }
    }

    return (
        <div className={`image-field ${secondRow ? "second-row" : ""}`}>
            <label className="info" htmlFor="">{title}</label>
            <section className="file-upload">
                {!value && <div className="no-image">
                    {!value && <NotFoundIcon/>}
                </div>}
                {value && <div className="preview">
                    <img src={`data:image/jpeg;base64,${value}`} alt=""/>
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
            {!isEmpty(error) && <span className="error">{error}</span>}
            {(!initial && isEmpty(value)) && <span className="error">{I18n.t("forms.imageRequired")}</span>}
        </div>
    );
}
