import React from "react";
import "./MissingAttributes.scss";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";
import noAccess from "../undraw/undraw_access_denied_re_awnf.svg";

export default function MissingAttributes() {

    return (
        <div className="mod-missing-attributes">
            <div className="content">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("missingAttributes.info"))}}/>
                <div className={"image-container"}>
                    <img src={noAccess}
                         className={"no-access"}
                         alt="No Access"/>
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("missingAttributes.contact"))}}/>
            </div>
        </div>
    );
}