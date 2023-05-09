import React from "react";
import I18n from "../../locale/I18n";

export default function UserTokens() {
    if (I18n.locale === "en") {
        return [
            <section key={1} className="explanation">
                <span className="strong">Tokens</span> allow you to use the API offered by services in your own scripts.
            </section>,
            <section key={2} className="details">
                The value of the token key must be placed in
                the Authorization header of the HTTP calls performed against the API of the
                service. You create tokens per service.
            </section>,
            < section key={4} className="example">
                <code>curl -H "Authorization: bearer $token_value" "https://service/api/endpoint"</code>
            </section>
        ];
    }
        return [
            <section key={1} className="explanation">
                <span className="strong">Tokens</span> maken het mogelijk de API van diensten te gebruiken in eigen scripts.
            </section>,
            <section key={2} className="details">
                De waarde van het token moet in
                de authorization header van de HTTP-aanroep van de API van de
                dienst geplaatst worden. Gebruik een token per dienst.
            </section>,
            < section key={4} className="example">
                <code>curl -H "Authorization: bearer $token_value" "https://service/api/endpoint"</code>
            </section>
        ]

}
