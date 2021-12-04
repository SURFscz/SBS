import React, {useState} from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./WelcomeDialog.scss";
import Button from "./Button";
import "react-mde/lib/styles/css/react-mde-all.css";
import CollaborationEn from "./welcome/CollaborationEn";
import CollaborationNL from "./welcome/CollaborationNl";
import {ROLES} from "../utils/UserRole";
import ToggleSwitch from "./redesign/ToggleSwitch";
import {isEmpty} from "../utils/Utils";
import {convertToHtml} from "../utils/Markdown";
import CheckBox from "./CheckBox";

export default function CollaborationWelcomeDialog({
                                                       name,
                                                       role,
                                                       isAdmin = false,
                                                       isOpen = false,
                                                       close,
                                                       collaboration,
                                                       isInvitation
                                                   }) {

    const [toggleRole, setToggleRole] = useState(role);
    const [disabled, setDisabled] = useState(collaboration.accepted_user_policy);

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
                    dangerouslySetInnerHTML={{__html: I18n.t("welcomeDialog.role", {role: I18n.t(`access.${toggleRole}`).toLowerCase()})}}/>
            </section>
            <section className="responsibilities">
                {I18n.locale === "en" ? <CollaborationEn role={toggleRole}/> : <CollaborationNL role={toggleRole}/>}
            </section>
            {!isEmpty(collaboration.accepted_user_policy) &&
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
                txt={I18n.t("welcomeDialog.ok", {type: I18n.t("welcomeDialog.collaboration")})}
                disabled={disabled} centralize={true}
                onClick={close}/>
        </Modal>
    );

}

