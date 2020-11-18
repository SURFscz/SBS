import React from "react";
import I18n from "i18n-js";
import "./UnitHeader.scss"
import Button from "../Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Logo from "./Logo";

export default function UnitHeader(props) {

    const {obj, mayEdit, onEdit, history, auditLogPath, name, svgClick, firstTime} = props;

    const queryParam = `name=${encodeURIComponent(name)}&back=${encodeURIComponent(window.location.pathname)}`;

    return (
        <div className="unit-header-container">
            <div className="unit-header">
                {obj.logo && <Logo src={obj.logo}/>}
                {obj.svg && <obj.svg onClick={() => svgClick && svgClick()}/>}
                {obj.icon && <FontAwesomeIcon icon={obj.icon}/>}
                {obj.name && <h1>{obj.name}</h1>}
                <div className="edit">
                    {mayEdit && <Button onClick={onEdit} txt={I18n.t("home.edit")}/>}
                    {(history && auditLogPath) &&
                    <span className="history"
                          onClick={() => history.push(`/audit-logs/${auditLogPath}?${queryParam}`)}>
                        <FontAwesomeIcon icon="history"/>{I18n.t("home.history")}
                    </span>}
                    {firstTime &&
                        <span className="onboarding" onClick={firstTime}><FontAwesomeIcon icon="plane-departure"/>{I18n.t("home.firstTime")}</span>}
                </div>
            </div>
            <div className="children">
                {props.children}
            </div>

        </div>
    )

}