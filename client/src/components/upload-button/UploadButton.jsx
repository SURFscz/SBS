import React from "react";
import "../input-field/InputField.scss";
import Button from "../button/Button";

export default function UploadButton({
                                         name,
                                         onFileUpload = null,
                                         txt,
                                         acceptFileFormat = "text/csv"
                                     }) {
    let fileInput;

    const onClick = () => {
        fileInput.click();
    };

    return (
        <div className="file-upload-button-container">
            <input type="file"
                   id={`fileUpload_${name}`}
                   ref={ref => fileInput = ref}
                   name={`fileUpload_${name}`}
                   accept={acceptFileFormat}
                   style={{display: "none"}}
                   onChange={onFileUpload}/>
            <Button txt={txt} onClick={onClick}/>
        </div>
    );

}
