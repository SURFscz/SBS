import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import Button from "./Button";
import "react-mde/lib/styles/css/react-mde-all.css";
import ServiceEn from "./welcome/ServiceEn";
import ServiceNl from "./welcome/ServiceNl";
import DOMPurify from "dompurify";

export default function ServiceWelcomeDialog({
                                                 name,
                                                 isOpen = false,
                                                 close
                                             }) {

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={() => false}
            contentLabel={I18n.t("welcomeDialog.label")}
            className="welcome-dialog-content"
            overlayClassName="welcome-dialog-overlay"
            closeTimeoutMS={250}
            shouldCloseOnOverlayClick={false}
            ariaHideApp={false}>
            <h1>{I18n.t("welcomeDialog.title", {name: name})}</h1>
            <section className="role">
                <InformationIcon/>
                <span
                    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcomeDialog.roleServiceAdmin"))}}/>
            </section>
            <section className="responsibilities">
                {I18n.locale === "en" ? <ServiceEn/> : <ServiceNl/>}
            </section>
            <Button
                txt={I18n.t("welcomeDialog.ok", {type: I18n.t("welcomeDialog.service")})}
                centralize={true}
                onClick={close}/>
        </Modal>
    );

}

