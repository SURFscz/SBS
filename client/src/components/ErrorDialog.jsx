import React from "react";
import I18n from "../locale/I18n";
import {AlertType, Modal} from "@surfnet/sds";

export default function ErrorDialog({isOpen = false, close}) {

    const content = () => {
        return (
            <section className="dialog-content">
                <p>{I18n.t("error_dialog.body")}</p>
            </section>

        );
    }

    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            confirm={close}
            alertType={AlertType.Error}
            subTitle={I18n.t("error_dialog.subTitle")}
            children={content()}
            title={I18n.t("error_dialog.title")}
            className={"welcome-dialog"}
            confirmationButtonLabel={I18n.t("error_dialog.ok")}
        />
    );

}
