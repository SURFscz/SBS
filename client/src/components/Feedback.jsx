import React, {useEffect, useRef, useState} from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import "./Feedback.scss";
import Button from "./Button";
import {isEmpty} from "../utils/Utils";
import {feedback} from "../api";
import {setFlash} from "../utils/Flash";
import DOMPurify from "dompurify";

export default function FeedbackDialog({isOpen = false, close}) {

    const [message, setMessage] = useState("");

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

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={doClose}
            className="feedback-dialog-content"
            overlayClassName="feedback-dialog-overlay"
            closeTimeoutMS={250}
            ariaHideApp={false}>
            <h1>{I18n.t("feedback.title")}</h1>
            <section className="info">
                <InformationIcon/>
                <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.info"))}}/>
            </section>
            <section className="feedback">
                <textarea name="feedback"
                          id="feedback"
                          value={message}
                          rows="10"
                          ref={inputRef}
                          onChange={e => setMessage(e.target.value)}/>
            </section>
            <section className="help">
                <h2 className="title" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.help"))}}/>
                <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.helpInfo"))}}/>
            </section>
            <section className="disclaimer">
                <span dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("feedback.disclaimer"),
                        {ADD_ATTR: ['target']})
                }}/>
            </section>
            <section className="actions">
                <Button txt={I18n.t("forms.cancel")} cancelButton={true} onClick={doClose}/>
                <Button txt={I18n.t("feedback.send")} disabled={isEmpty(message)} onClick={sendFeedBack}/>
            </section>

        </Modal>
    );

}

