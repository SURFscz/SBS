import React from "react";
import I18n from "../../locale/I18n";

export default function OrganisationServicesExplanation() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                Services mandatory for all collaboration are automatically connected to all collaborations in your organisation and can thus be used by all the members of all collaborations in your organisation.
                If the service is configured to require permission from its service administrator, it cannot be made mandatory for your organisation.
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                Als een dienst verplicht is voor een organisatie, wordt deze automatisch gekoppeld aan alle samenwerkingen van die organisatie, en kan dan gebruikt worden door alle leden van de samenwerkingen van de organisatie.
                Indien een dienstbeheerder toestemming moet geven voor het koppelen van de dienst aan een samenwerking, is het niet mogelijk de dienst verplicht te maken voor een organisatie.
            </section>
        ]

}
