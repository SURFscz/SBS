import React from "react";
import I18n from "../../locale/I18n";

export default function ServiceGroupsExplanation() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                Service groups are predefined groups which are automatically created in a collaboration whenever the service is connected to the collaboration.
                For example, if a service requires users to be in the group 'Create files' to be authorized to create new files in the service, a service admin can provision collaborations that allow access to that service with a group with that name. The collaboration admin can then provision the group with members.
            </section>,
            <section key={2} className="details">
                Refer to the <a target="_blank" rel="noreferrer" href="https://edu.nl/e9x8x">documentation</a> for details.
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                Dienstgroepen zijn voorgedefinieerde groepen die automatisch worden toegevoegd aan een samenwerking op het moment van koppelen met en dienst.
                Bijvoorbeeld, een dienst vereist dat gebruikers lid zijn van de groep 'bestanden maken' om geautoriseerd te zijn bestanden te maken in die dienst. De dienstbeheerder kan samenwerkingen die toegang tot de dienst toestaan voorzien van die groep. De samenwerkingsbeheerder kan de groepen dan vullen met leden.
            </section>,
            <section key={2} className="details">
                Zie de <a target="_blank" rel="noreferrer" href="https://edu.nl/e9x8x">documentatie</a> voor details.
            </section>
        ]

}
