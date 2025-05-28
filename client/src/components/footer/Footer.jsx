import React from "react";
import I18n from "../../locale/I18n";
import "./Footer.scss"
import LanguageSelector from "../language-selector/LanguageSelector";
import {Logo, LogoType} from "@surfnet/sds";

export default function Footer() {
    return (
        <footer className="sds--footer sds--footer--single-bar">
            <div className="sds--page-container">
                <div className="sds--footer--inner">
                    <nav className="menu sds--text--body--small">
                        <ul>
                            <li>
                                <a href={I18n.t("footer.supportLink")} target="_blank"
                                   rel="noopener noreferrer"><span>{I18n.t("footer.support")}</span></a>
                            </li>
                            <li>
                                <a href={I18n.t("footer.termsLink")} target="_blank"
                                   rel="noopener noreferrer"><span>{I18n.t("footer.terms")}</span></a>
                            </li>
                            <li>
                                <a href={I18n.t("footer.privacyLink")} target="_blank"
                                   rel="noopener noreferrer"><span>{I18n.t("footer.privacy")}</span></a>
                            </li>
                        </ul>
                    </nav>
                    <LanguageSelector/>
                    <div className="sds--branding">
                        <a href={I18n.t("footer.surfLink")} target="_blank"
                           rel="noopener noreferrer">{<Logo label={""} position={LogoType.Bottom}/>}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
