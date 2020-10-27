import React from "react";
import I18n from "i18n-js";
import "./UnitHeader.scss"
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function UnitHeader({props}) {

    const {obj, mayEdit, onEdit} = props;

    return (
        <div className="unit-header-container">
            <div className="unit-header">
                {obj.logo && <img src={`data:image/jpeg;base64,${obj.logo}`}/>}
                {obj.svg && <obj.svg/>}
                {obj.name && <h1>{obj.name}</h1>}
                {mayEdit && <div className="edit">
                    <Button onClick={onEdit} txt={I18n.t("home.edit")}/>
                    <span><FontAwesomeIcon icon="history"/>{I18n.t("home.edit")}</span>
                </div>}
            </div>
            {obj.description && <p>{obj.description}</p>}
            {props.children}
        </div>
    )

}