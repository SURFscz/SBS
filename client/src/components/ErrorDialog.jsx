import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import Button from "./Button";

export default function ErrorDialog({isOpen = false, close}) {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={close}
            contentLabel={I18n.t("error_dialog.title")}
            className="confirmation-dialog-content"
            overlayClassName="confirmation-dialog-overlay"
            closeTimeoutMS={250}
            ariaHideApp={false}>
            <section className="dialog-header error">
                {I18n.t("error_dialog.title")}
            </section>
            <section className="dialog-content">
                <h2>{I18n.t("error_dialog.body")}</h2>
            </section>
            <section className="dialog-buttons">
                <Button cancelButton={true} className={"orphan"} onClick={close} txt={I18n.t("error_dialog.ok")}/>
            </section>
        </Modal>
    );

}

