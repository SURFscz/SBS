import React, {useState} from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import "./welcome/welcome.scss";
import Button from "./Button";
import "react-mde/lib/styles/css/react-mde-all.css";
import {ROLES} from "../utils/UserRole";
import ToggleSwitch from "./redesign/ToggleSwitch";
import CollaborationAupAcceptance from "./CollaborationAupAcceptance";
import DOMPurify from "dompurify";

export default function CollaborationWelcomeDialog({
                                                       name,
                                                       role,
                                                       serviceEmails,
                                                       isAdmin = false,
                                                       isOpen = false,
                                                       close,
                                                       collaboration,
                                                       isInvitation
                                                   }) {
    const services = [...new Map(collaboration.services.concat(collaboration.organisation.services).map((s) => [s["id"], s])).values()];
    const hasServices = services.length > 0;

    const [toggleRole, setToggleRole] = useState(role);
    const [disabled, setDisabled] = useState(true && hasServices);

    const doToggleRole = () => {
        setToggleRole(toggleRole === ROLES.COLL_ADMIN ? ROLES.COLL_MEMBER : ROLES.COLL_ADMIN);
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
                <ToggleSwitch value={toggleRole === ROLES.COLL_ADMIN} onChange={doToggleRole}/>
                <span className="toggle-txt">{I18n.t("welcomeDialog.toggleRole")}</span>
            </div>}
            <h1>{I18n.t("welcomeDialog.title", {name: name})}</h1>
            <section className="role">
                <InformationIcon/>
                <span
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                            I18n.t(`welcomeDialog.${toggleRole === ROLES.COLL_ADMIN ? "roleCollaborationAdmin" : "roleCollaborationMember"}`))
                    }}/>
            </section>
            <section className="responsibilities welcome">
                <p>{I18n.t(`welcomeDialog.${toggleRole === ROLES.COLL_ADMIN ? "infoAdmin" : "infoMember"}`)}</p>
            </section>
            <h2>{I18n.t("welcomeDialog.purpose")}</h2>
            <section className="responsibilities welcome">
                <p>{collaboration.description}</p>
            </section>
            <CollaborationAupAcceptance services={services}
                                        disabled={disabled}
                                        serviceEmails={serviceEmails}
                                        setDisabled={setDisabled}
                                        children={services.length > 0 ?
                                            <h2>{I18n.t("models.collaboration.services", {nbr: services.length})}</h2> : null}
            />
            <Button
                txt={I18n.t("welcomeDialog.proceed", {name: collaboration.name})}
                disabled={disabled} centralize={true}
                onClick={close}/>
        </Modal>
    );

}

