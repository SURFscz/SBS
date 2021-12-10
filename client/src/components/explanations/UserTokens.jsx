import React from "react";

export default function UserTokens() {
    return [
        <section key={1} className="explanation">
            <span className="strong">Tokens</span> allow you to use the API offered by <span
            className="strong">Services</span> in your own scripts.
        </section>,
        <section key={2} className="details">
            The value of the Token key must be placed in
            the <span className="strong">Authorization</span> header of the HTTP calls performed against the API of the
            service. You create <span className="strong">Tokens</span> per <span className="strong">Service</span>.
        </section>,
        < section key={4} className="example">
            <code>curl -H "Authorization: bearer $token_value" "https://service/api/endpoint"</code>
        </section>,
        <section key={5} className="details">
            Please contact <a href="mailto:sram-support@surf.nl"> sram-support@surf.nl</a> if you have any questions
            with
            regards to <span className="strong">User token</span>.
        </section>]

}
