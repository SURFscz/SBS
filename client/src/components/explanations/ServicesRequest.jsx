import React from "react";
import I18n from "../../locale/I18n";

export default function ServicesRequestExplanation({name}) {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                The service <span className="strong">{name}</span> redirected you to this page as you can not use
                this service unless you add it to one of your collaborations.
            </section>,
            <section key={3} className="details">
                Decide to which collaboration you would like to add the service <span className="strong">{name}</span>.
            </section>,
            < section key={2} className="example">
                If the service <span className="strong">{name}</span> is configured to require manual approval of the
                service owner
                we will create a <span className="strong">Service Connection Request</span> which needs to be approved
                before you can use this service.
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                De dienst <span className="strong">{name}</span> heeft je doorverwezen naar deze pagina omdat je
                geen toegang hebt tot de dienst tenzij je lid bent van een eraan gekoppelde samenwerking.
            </section>,
            <section key={3} className="details">
                Besluit aan welke samenwerkingn je dienst <span className="strong">{name}</span> wil koppelen.
            </section>,
            < section key={2} className="example">
                Als de dienst <span className="strong">{name}</span> geconfigureed is om toestemming van de dienstbeheerder
                te vereisen, wordt een <span className="strong">koppelverzoek</span> gemaakt, dat goedgekeurd moet worden
                voordat je de dienst kunt gebruiken.
            </section>
        ]

}
