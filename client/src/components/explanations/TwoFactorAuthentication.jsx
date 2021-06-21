import React from "react";
import I18n from "i18n-js";

export default function ImpersonateExplanation() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                If you don't have access to your phone and / or authenticator app, then you should contact the
                administrator of your collaboration or the administrator of your organization and request he / she
                to reset your 2-factor setting.
            </section>,
            <section key={2} className="details">
                Please contact
                <a href="mailto:sram-support@surf.nl"> sram-support@surf.nl</a> if you have nu clue who else to contact.
            </section>
        ];
    }
    return [
        <section key={1} className="explanation">
            Als je geen toegang hebt tot je telefoon en/of authenticator-app, neem dan contact op met de
            beheerder van uw samenwerking of de beheerder van uw organisatie en verzoek hij/zij
            om uw 2-factorinstelling te resetten.
        </section>,
            <section key={2} className="details">
                Neem contact op
                <a href="mailto:sram-support@surf.nl">sram-support@surf.nl</a> als je geen idee hebt met wie je contact moet opnemen.
        </section>]

}
