import React from "react";
import "./NotFound.scss";
import NotFoundSVG from "../../lotties/undraw_page_not_found.svg?react";
import InvitationNotFoundSVG from "../../icons/invitation_404.svg?react";

import I18n from "../../locale/I18n";
import DOMPurify from "dompurify";

export default function NotFound({config}) {

    const urlSearchParams = new URLSearchParams(window.location.search);
    const translation = I18n.translations[I18n.locale];
    let errorMessage = DOMPurify.sanitize(urlSearchParams.get("eo") || "msg");
    if (!translation.notFound[errorMessage]) {
        errorMessage = "msg";
    }
    const html = DOMPurify.sanitize(I18n.t(`notFound.${errorMessage}`, {base_url: config.base_url}));
    return (
        <div className="mod-not-found">
            <div className="mod-inner-not-found">
                <p className="not-found-msg" dangerouslySetInnerHTML={{__html: html}}/>
                {errorMessage === "invitationNotFound" && <InvitationNotFoundSVG/>}
                {errorMessage !== "invitationNotFound" && <NotFoundSVG/>}
            </div>
        </div>
    );
}
