import React from "react";
import {Modal, } from "@surfnet/sds";
import I18n from "i18n-js";

import "./ConfirmationDialog.scss";
import Button from "./Button";
import {pseudoGuid} from "../utils/Utils";

export default function ConfirmationDialog({
                                               isOpen = false, cancel, confirm, question = "",
                                               leavePage = false, isError = false, isWarning = false,
                                               disabledConfirm = false, children = null,
                                               confirmationTxt = I18n.t("confirmationDialog.confirm"),
                                               largeWidth =false,
                                               confirmationHeader = I18n.t("confirmationDialog.title")
                                           }) {
    AlertType
    return <Modal confirm={confirm} cancel={cancel}/>
    const className = isError ? " error " : isWarning ? " warning " : "";
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={cancel}
            contentLabel={I18n.t("confirmationDialog.title")}
            className={`confirmation-dialog-content ${largeWidth ? "large-width" : ""}`}
            overlayClassName="confirmation-dialog-overlay"
            closeTimeoutMS={0}
            ariaHideApp={false}>
            <section className={`dialog-header  ${className}`}>
                {confirmationHeader}
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
                {cancel && <Button cancelButton={true}
                                   txt={leavePage ? I18n.t("confirmationDialog.leave") : I18n.t("confirmationDialog.cancel")}
                                   onClick={cancel}/>}
                <Button txt={leavePage ? I18n.t("confirmationDialog.stay") : confirmationTxt}
                        onClick={() => !disabledConfirm && confirm()}
                        className={`className ${cancel ? "" : "orphan"}`} disabled={disabledConfirm}/>
            </section>
        </Modal>
    );

}

