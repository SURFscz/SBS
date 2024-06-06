import React from "react";
import I18n from "../locale/I18n";
import "./CountDownDialog.scss";
import {Modal} from "@surfnet/sds";
import DOMPurify from "dompurify";

export default function CountDownDialog({
                                            service,
                                            isOpen = false,
                                            counter
                                        }) {

    const content = () => {
        return (
            <section className={"count-down-content"}>
                <p>
                    {I18n.t("countDownDialog.subTitle", {name: service.name})}
                </p>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("countDownDialog.info", {counter: counter}))}}/>
            </section>)
    }
    if (!isOpen) {
        return null;
    }

    return (
        <Modal
            confirm={null}
            subTitle={null}
            children={content()}
            title={I18n.t("countDownDialog.title", {name: service.name})}
            className={"count-down-dialog"}
        />
    );

}

