import React from "react";
import I18n from "../../locale/I18n";
import "../WelcomeDialog.scss";
import ServiceEn from "../welcome/ServiceEn";
import ServiceNl from "../welcome/ServiceNl";
import {AlertType, Modal} from "@surfnet/sds";

export default function ServiceWelcomeDialog({
                                                 name,
                                                 isOpen = false,
                                                 invitation = {intended_role: "admin"},
                                                 close
                                             }) {

    const content = () => {
        return (
            <section className={"welcome-dialog-content"}>
                <section className="responsibilities">
                    {I18n.locale === "en" ? <ServiceEn role={invitation.intended_role}/> : <ServiceNl role={invitation.intended_role}/>}
                </section>

            </section>)
    }
    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            confirm={close}
            alertType={AlertType.Info}
            subTitle={I18n.t("welcomeDialog.roleServiceAdmin", {role: invitation.intended_role})}
            children={content()}
            title={I18n.t("welcomeDialog.title", {name: name})}
            confirmationButtonLabel={I18n.t("welcomeDialog.ok", {type: I18n.t("welcomeDialog.service")})}
            className={"welcome-dialog"}
        />
    );

}
