import React from "react";

export default function ApiKeysExplanation() {
    return [
        <section key={1} className="explanation">
            <span className="strong">API keys</span> allow you to use the API offered by <span
            className="strong">SRAM</span> in
            your own scripts.
        </section>,
        <section key={2} className="details">
            The value of the API key must be placed in
            the <span className="strong">Authorization</span> header of the HTTP calls performed against the API.
        </section>,
        < section key={3} className="example">
            <code>curl -H "Authorization: api_key_value" "https://sbs.surf.nl/api/organisations"</code>
        </section>,
        <section key={4} className="details">
            Please contact <a href="mailto:sram-support@surf.nl"> sram-support@surf.nl</a> if you have any questions
            with
            regards to <span className="strong">API keys</span>.
        </section>]

}
