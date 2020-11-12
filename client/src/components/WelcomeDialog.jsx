import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import Button from "./Button";
import OrganisationEn from "./welcome/OrganisationEn";
import CollaborationEn from "./welcome/CollaborationEn";
import OrganisationNl from "./welcome/OrganisationNl";
import CollaborationNL from "./welcome/CollaborationNl";

export default function WelcomeDialog({name, role, isOpen = false, close, isOrganisation}) {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={close}
            contentLabel={I18n.t("welcomeDialog.label")}
            className="welcome-dialog-content"
            overlayClassName="welcome-dialog-overlay"
            closeTimeoutMS={250}
            ariaHideApp={false}>
            <h1>{I18n.t("welcomeDialog.title", {name: name})}</h1>
            <section className="role">
                <InformationIcon/>
                <span dangerouslySetInnerHTML={{__html: I18n.t("welcomeDialog.role", {role: I18n.t(`access.${role}`).toLowerCase()})}}/>
            </section>
            <section className="responsibilities">
                {(isOrganisation && I18n.locale === "en") && <OrganisationEn role={role}/>}
                {(isOrganisation && I18n.locale === "nl") && <OrganisationNl role={role}/>}
                {(!isOrganisation && I18n.locale === "en") && <CollaborationEn role={role}/>}
                {(!isOrganisation && I18n.locale === "nl") && <CollaborationNL role={role}/>}
            </section>
            <Button
                txt={I18n.t("welcomeDialog.ok", {type: isOrganisation ? I18n.t("welcomeDialog.organisation") : I18n.t("welcomeDialog.collaboration")})}
                onClick={close}/>
        </Modal>
    );

}

