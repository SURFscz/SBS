import React, {useEffect, useRef, useState} from "react";

import I18n from "../../locale/I18n";
import "./Feedback.scss";
import {isEmpty} from "../../utils/Utils";
import {feedback} from "../../api";
import {setFlash} from "../../utils/Flash";
import DOMPurify from "dompurify";
import {AlertType, Modal} from "@surfnet/sds";

export default function FeedbackDialog({isOpen = false, close, initialMessage = ""}) {

    if (!isOpen) {
        return null;
    }

    const [message, setMessage] = useState(initialMessage);

    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current && inputRef.current.focus();
    });

    const doClose = () => {
        close();
        setTimeout(() => setMessage(""), 500);
    }

    const sendFeedBack = () => {
        feedback(message).then(() => {
            doClose();
            setFlash(I18n.t("feedback.flash"));
        });
    }

    const content = () => {
        return (
            <div className={"feedback-content"}>
                <div className="sds--text-area">
                    <textarea name="feedback"
                              id="feedback"
                              value={message}
                              rows="10"
                              ref={inputRef}
                              onChange={e => setMessage(e.target.value)}/>
                </div>
                <section className="help">
                    <h3 className="title"
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.help"))}}/>
                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.helpInfo"))}}/>
                </section>
                <section className="disclaimer">
                <span dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("feedback.disclaimer"),
                        {ADD_ATTR: ['target']})
                }}/>
                </section>
            </div>)
    }


    return (
        <Modal
            confirm={sendFeedBack}
            cancel={doClose}
            alertType={AlertType.Info}
            subTitle={I18n.t("feedback.info")}
            children={content()}
            title={I18n.t("feedback.title")}
            cancelButtonLabel={I18n.t("forms.cancel")}
            confirmationButtonLabel={I18n.t("feedback.send")}
            confirmDisabled={isEmpty(message)}
            question={null}/>
    );

}
