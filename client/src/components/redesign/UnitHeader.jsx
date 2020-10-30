import React from "react";
import I18n from "i18n-js";
import "./UnitHeader.scss"
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default function UnitHeader(props) {

    const {obj, mayEdit, onEdit} = props;

    return (
        <div className="unit-header-container">
            <div className="unit-header">
                {obj.logo && <img src={`data:image/jpeg;base64,${obj.logo}`} alt={obj.name}/>}
                {obj.svg && <obj.svg/>}
                {obj.icon && <FontAwesomeIcon icon="user-secret"/>}
                {obj.name && <h1>{obj.name}</h1>}
                {mayEdit && <div className="edit">
                    <Button onClick={onEdit} txt={I18n.t("home.edit")}/>
                    <span><FontAwesomeIcon icon="history"/>{I18n.t("home.history")}</span>
                </div>}
            </div>
            <div className="children">
                {props.children}
            </div>

        </div>
    )

}