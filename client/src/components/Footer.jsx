import React from "react";
import I18n from "i18n-js";
import "./Footer.scss"
import LanguageSelector from "./LanguageSelector";
import {Logo, LogoType} from "@surfnet/sds";

export default function Footer() {
    return (
        <div className="footer">
            <div className="footer-inner">
            <section className="info left">
                <span>{I18n.t("footer.tips")}</span>
                <a href={I18n.t("footer.productLink")} target="_blank"
                         rel="noopener noreferrer">{I18n.t("footer.help")}</a>
            </section>
                <LanguageSelector />
            <section className="info right">
                <a href={I18n.t("footer.surfLink")} target="_blank"
                         rel="noopener noreferrer">{<Logo label={""} position={LogoType.Bottom}/>}</a>
            </section>

            </div>
        </div>
    );
}
