import React from "react";
import "./SpinnerField.scss"
import MDSpinner from "react-md-spinner";

export default function SpinnerField({absolute = false}) {
    return (<div className={`mod-spinner-loading ${absolute ? "absolute" : ""}`}>
        <MDSpinner/>
    </div>);
}