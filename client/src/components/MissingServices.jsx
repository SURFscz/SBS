import React from "react";
import I18n from "i18n-js";
import "./MissingServices.scss";
import DOMPurify from "dompurify";

export default function MissingServices({nbrServices}) {

    return (
        <div className={`missing-services services_${nbrServices}`}>
            <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.services.missingServices"))}}/>
        </div>
    );

}

