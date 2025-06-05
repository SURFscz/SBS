import React, {useState} from "react";
import I18n from "../../locale/I18n";
import "../WelcomeDialog.scss";
import OrganisationEn from "../welcome/OrganisationEn";
import OrganisationNl from "../welcome/OrganisationNl";
import {ROLES} from "../../utils/UserRole";
import ToggleSwitch from "../redesign/toggle-switch/ToggleSwitch";
import {AlertType, Modal} from "@surfnet/sds";

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

    const content = () => {
        return (
            <section className={"welcome-dialog-content"}>
                {(isAdmin && !isInvitation) && <div className="toggle-role">
                    <ToggleSwitch value={toggleRole === ROLES.ORG_ADMIN} onChange={doToggleRole}/>
                    <span className="toggle-txt">{I18n.t("welcomeDialog.toggleRole")}</span>
                </div>}
                <section className="responsibilities">
                    {I18n.locale === "en" ? <OrganisationEn role={toggleRole}/> : <OrganisationNl role={toggleRole}/>}
                </section>
            </section>
        );
    }
    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            confirm={close}
            alertType={AlertType.Info}
            subTitle={I18n.t(`welcomeDialog.${toggleRole === ROLES.ORG_ADMIN ? "roleOrganisationAdmin" : "roleOrganisationManager"}`)}
            children={content()}
            title={I18n.t("welcomeDialog.title", {name: name})}
            confirmationButtonLabel={I18n.t("welcomeDialog.ok", {type: I18n.t("welcomeDialog.organisation")})}
            className={"welcome-dialog"}
        />
    );
}
