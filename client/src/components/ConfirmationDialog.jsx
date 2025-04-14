import React from "react";
import {Modal,} from "@surfnet/sds";
import I18n from "../locale/I18n";


export default function ConfirmationDialog({
                                               isOpen = false,
                                               cancel,
                                               confirm,
                                               question = "",
                                               leavePage = false,
                                               disabledConfirm = false,
                                               children = null,
                                               confirmationTxt = I18n.t("confirmationDialog.confirm"),
                                               largeWidth = false,
                                               confirmationHeader = I18n.t("confirmationDialog.title"),
                                               cancelButtonLabel = I18n.t("confirmationDialog.cancel")
                                           }) {
    if (!isOpen) {
        return null;
    }
    return (
        <Modal
            confirm={confirm}
            cancel={cancel}
            // alertType={isError ? AlertType.Error : isWarning ? AlertType.Warning : AlertType.Info}
            question={leavePage ? I18n.t("confirmationDialog.leavePage") : question}
            children={children}
            title={confirmationHeader || I18n.t("confirmationDialog.title")}
            cancelButtonLabel={leavePage ? I18n.t("confirmationDialog.leave") : cancelButtonLabel}
            confirmationButtonLabel={leavePage ? I18n.t("confirmationDialog.stay") : confirmationTxt}
            confirmDisabled={disabledConfirm}
            subTitle={leavePage ? I18n.t("confirmationDialog.leavePage") : I18n.t("confirmationDialog.subTitle")}
            full={largeWidth}/>
    );

}
