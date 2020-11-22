import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";

import "./ConfirmationDialog.scss";
import Button from "./Button";

export default function ConfirmationDialog({
                                               isOpen = false, cancel, confirm, question = "",
                                               leavePage = false, isError = false, isWarning = false,
                                               disabledConfirm = false, children = null, closeTimeoutMS=125
                                           }) {
    const className = isError ? " error " : isWarning ? " warning " : "";
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={cancel}
            contentLabel={I18n.t("confirmationDialog.title")}
            className="confirmation-dialog-content"
            overlayClassName="confirmation-dialog-overlay"
            closeTimeoutMS={closeTimeoutMS}
            ariaHideApp={false}>
            <section className={`dialog-header  ${className}`}>
                {I18n.t("confirmationDialog.title")}
            </section>
            {leavePage ?
                <section className={"dialog-content"}>
                    <h2>{I18n.t("confirmationDialog.leavePage")}</h2>
                    <p>{I18n.t("confirmationDialog.leavePageSub")}</p>
                </section> :
                <section className={"dialog-content"}>
                    <h2>{question}</h2>
                    {children && children}
                </section>}
            <section className="dialog-buttons">
                <Button txt={leavePage ? I18n.t("confirmationDialog.stay") : I18n.t("confirmationDialog.confirm")}
                        onClick={() => !disabledConfirm && confirm()}
                        className={className} disabled={disabledConfirm}/>
                <Button cancelButton={true}
                        txt={leavePage ? I18n.t("confirmationDialog.leave") : I18n.t("confirmationDialog.cancel")}
                        onClick={cancel}/>
            </section>
        </Modal>
    );

}

