import React, {useState} from "react";
import {AlertType, Modal} from "@surfnet/sds";
import I18n from "../locale/I18n";
import "./WelcomeDialog.scss";
import "./welcome/welcome.scss";
import "react-mde/lib/styles/css/react-mde-all.css";
import {ROLES} from "../utils/UserRole";
import CollaborationAupAcceptance from "./CollaborationAupAcceptance";
import {isEmpty} from "../utils/Utils";

export default function CollaborationWelcomeDialog({
                                                       name,
                                                       role,
                                                       serviceEmails,
                                                       isOpen = false,
                                                       close,
                                                       collaboration
                                                   }) {
    const services = [...new Map(collaboration.services.concat(collaboration.organisation.services).map((s) => [s["id"], s])).values()];
    const hasServices = services.filter(service => !isEmpty(service.accepted_user_policy)).length > 0;

    const [disabled, setDisabled] = useState(hasServices);

    const content = () => {
        return (<section className={"welcome-dialog-content"}>
                {services.length > 0 &&
                <section className="responsibilities welcome">
                    <p>{I18n.t(`welcomeDialog.${role === ROLES.COLL_ADMIN ? "infoAdmin" : "infoMember"}`)}</p>
                </section>}
                <h3>{I18n.t("welcomeDialog.purpose")}</h3>
                <section className="responsibilities welcome">
                    <p>{collaboration.description}</p>
                </section>
                <CollaborationAupAcceptance services={services}
                                            disabled={disabled}
                                            serviceEmails={serviceEmails}
                                            setDisabled={setDisabled}
                                            children={services.length > 0 ?
                                                <h3>{I18n.t("models.collaboration.services", {nbr: services.length})}</h3> :
                                                <h3>{I18n.t("models.collaboration.noServicesYet")}</h3>}
                />
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
            subTitle={I18n.t(`welcomeDialog.${role === ROLES.COLL_ADMIN ? "roleCollaborationAdmin" : "roleCollaborationMember"}`)}
            children={content()}
            title={I18n.t("welcomeDialog.title", {name: name})}
            confirmationButtonLabel={I18n.t("welcomeDialog.proceed", {name: collaboration.name})}
            confirmDisabled={disabled}
            className={"welcome-dialog collaboration"}
        />
    );

}

