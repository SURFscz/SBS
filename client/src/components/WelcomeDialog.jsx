import React, {useState} from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import Button from "./Button";
import "react-mde/lib/styles/css/react-mde-all.css";
import OrganisationEn from "./welcome/OrganisationEn";
import CollaborationEn from "./welcome/CollaborationEn";
import OrganisationNl from "./welcome/OrganisationNl";
import CollaborationNL from "./welcome/CollaborationNl";
import {ROLES} from "../utils/UserRole";
import ToggleSwitch from "./redesign/ToggleSwitch";
import {isEmpty} from "../utils/Utils";
import {convertToHtml} from "../utils/Markdown";
import CheckBox from "./CheckBox";

export default function WelcomeDialog({
                                          name,
                                          role,
                                          isAdmin = false,
                                          isOpen = false,
                                          close,
                                          collaboration,
                                          organisation,
                                          isInvitation
                                      }) {

    const [toggleRole, setToggleRole] = useState(role);
    const [disabled, setDisabled] = useState(collaboration && collaboration.accepted_user_policy);

    const doToggleRole = () => {
        if (organisation) {
            setToggleRole(toggleRole === ROLES.ORG_ADMIN ? ROLES.ORG_MANAGER : ROLES.ORG_ADMIN);
        } else {
            setToggleRole(toggleRole === ROLES.COLL_ADMIN ? ROLES.COLL_MEMBER : ROLES.COLL_ADMIN);
        }
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
                <ToggleSwitch value={organisation ? toggleRole === ROLES.ORG_ADMIN : toggleRole === ROLES.COLL_ADMIN}
                              onChange={doToggleRole}/>
                <span className="toggle-txt">{I18n.t("welcomeDialog.toggleRole")}</span>
            </div>}
            <h1>{I18n.t("welcomeDialog.title", {name: name})}</h1>
            <section className="role">
                <InformationIcon/>
                <span
                    dangerouslySetInnerHTML={{__html: I18n.t("welcomeDialog.role", {role: I18n.t(`access.${toggleRole}`).toLowerCase()})}}/>
            </section>
            <section className="responsibilities">
                {(organisation && I18n.locale === "en") && <OrganisationEn role={toggleRole}/>}
                {(organisation && I18n.locale === "nl") && <OrganisationNl role={toggleRole}/>}
                {(!organisation && I18n.locale === "en") && <CollaborationEn role={toggleRole}/>}
                {(!organisation && I18n.locale === "nl") && <CollaborationNL role={toggleRole}/>}
            </section>
            {(collaboration && !isEmpty(collaboration.accepted_user_policy)) &&
            <section className="accepted-user-policy-container">
                <h2>{I18n.t("aup.collaboration.title")}</h2>
                <p>{I18n.t("aup.collaboration.info")}</p>
                <div className="mde-preview-content accepted-user-policy">
                    <div className="inner-accepted-user-policy">
                        <p dangerouslySetInnerHTML={{
                            __html: convertToHtml(collaboration.accepted_user_policy, true)
                        }}/>
                    </div>
                </div>
                <div className="terms">
                    <CheckBox name="aup" value={!disabled} info={I18n.t("aup.collaboration.agreeWithTerms")}
                              onChange={() => setDisabled(!disabled)}/>
                </div>
            </section>}
            <Button
                txt={I18n.t("welcomeDialog.ok", {type: organisation ? I18n.t("welcomeDialog.organisation") : I18n.t("welcomeDialog.collaboration")})}
                disabled={disabled}
                onClick={close}/>
        </Modal>
    );

}

