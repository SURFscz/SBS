import React from "react";
import I18n from "i18n-js";
import "./Footer.scss"

export default function Footer() {
    return (
        <div className="footer">
            <div className="footer-inner">
                <span><a href={I18n.t("footer.productLink")} target="_blank"
                         rel="noopener noreferrer">{I18n.t("footer.product")}</a></span>
                <span><a href={I18n.t("footer.privacyLink")} target="_blank"
                         rel="noopener noreferrer">{I18n.t("footer.privacy")}</a></span>
            </div>
        </div>
    );
}
