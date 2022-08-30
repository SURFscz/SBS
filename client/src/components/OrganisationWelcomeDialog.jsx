import React, {useState} from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import Button from "./Button";
import "react-mde/lib/styles/css/react-mde-all.css";
import OrganisationEn from "./welcome/OrganisationEn";
import OrganisationNl from "./welcome/OrganisationNl";
import {ROLES} from "../utils/UserRole";
import ToggleSwitch from "./redesign/ToggleSwitch";
import DOMPurify from "dompurify";

export default function OrganisationWelcomeDialog({
                                          name,
                                          role,
                                          isAdmin = false,
                                          isOpen = false,
                                          close,
                                          isInvitation
                                      }) {

    const [toggleRole, setToggleRole] = useState(role);

    const doToggleRole = () => {
            setToggleRole(toggleRole === ROLES.ORG_ADMIN ? ROLES.ORG_MANAGER : ROLES.ORG_ADMIN);
    }

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
            {(isAdmin && !isInvitation) && <div className="toggle-role">
                <ToggleSwitch value={toggleRole === ROLES.ORG_ADMIN} onChange={doToggleRole}/>
                <span className="toggle-txt">{I18n.t("welcomeDialog.toggleRole")}</span>
            </div>}
            <h1>{I18n.t("welcomeDialog.title", {name: name})}</h1>
            <section className="role">
                <InformationIcon/>
                <span
                    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcomeDialog.role", {role: I18n.t(`access.${toggleRole}`).toLowerCase()}))}}/>
            </section>
            <section className="responsibilities">
                {I18n.locale === "en" ? <OrganisationEn role={toggleRole}/> : <OrganisationNl role={toggleRole}/>}
            </section>
            <Button
                txt={I18n.t("welcomeDialog.ok", {type: I18n.t("welcomeDialog.organisation")})}
                centralize={true}
                onClick={close}/>
        </Modal>
    );

}

