import React from "react";
import I18n from "../../locale/I18n";

export default function ApiKeysExplanation() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                An API key allow you to use the API offered by SURF research access management in your own scripts.
            </section>,
            <section key={2} className="details">
                The value of the API key must be placed in the authorization header of the HTTP calls performed against the API:
            </section>,
            <section key={3} className="details">
                Refer to the <a target="_blank" rel="noreferrer" href="https://edu.nl/rxeb6">documentation</a> for details.
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                Een API-sleutel is benodigd om de API van SURF research access management te gebruiken in een eigen script.
            </section>,
            <section key={2} className="details">
                De waarde van de API-sleutel moet als authorization header van de HTTP-aanroep van de API gebruikt worden:
            </section>,
            <section key={3} className="details">
                Zie de <a target="_blank" rel="noreferrer" href="https://edu.nl/rxeb6">documentation</a> voor details.
            </section>
        ]

}
