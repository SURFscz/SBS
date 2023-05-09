import React from "react";
import I18n from "../../locale/I18n";

export default function ImpersonateExplanation() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                As a platform admin you can impersonate other users. Impersonating makes it so that you see the application exactly as that user, except for the impersonate menu item.
                For example, impersonating a regular member of a collaboration will limit the view to the memberships of that user.
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                Als platformbeheerder kun je andere gebruikers immiteren, zodat je de applicatie precies ziet zoals de gebruiker, uitgezonderd het element 'immiteer' in het menu.
                Het immiteren van een lid van een samenwerking, bijvoorbeeld, zal het zicht beperken tot het lidmaatschap van die samenwerking.
            </section>
        ]

}
