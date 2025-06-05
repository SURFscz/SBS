import React from "react";
import I18n from "../../../locale/I18n";
import "./OnBoardingMessage.scss";
import DOMPurify from "dompurify";
import {convertToHtml} from "../../../utils/Markdown";

export default function OnBoardingMessage({organisation}) {
    return (
        <div className={"on-boarding"}>
            <h2 dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("welcome.instructions", {name: organisation.name}))
            }}/>
            <div className="instructions mde-preview">
                <div className="mde-preview-content">
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(convertToHtml(organisation.on_boarding_msg))
                    }}/>
                </div>
            </div>
        </div>)
}
