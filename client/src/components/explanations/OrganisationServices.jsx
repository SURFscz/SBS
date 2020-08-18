import React from "react";

export default function OrganisationServicesExplanation() {
    return [
        <section key={1} className="explanation">
            You can add <span className="strong">Services</span> to your <span
            className="strong">Organisation </span> and these <span className="strong">Services </span>
            can be used by all the members of all <span
            className="strong">Collaborations </span> in this <span
            className="strong">Organisation </span>.
        </section>,
        <section key={2} className="details">
            If the <span className="strong">Service</span> is configured to have limited access to specific <span
            className="strong">Organisations </span> or can not be connected automatically then
            you can not add the service to your <span className="strong">Organisation</span>.
        </section>,
        <section key={5} className="details">
            Please contact
            <a href="mailto:sram-support@surf.nl"> sram-support@surf.nl</a> if you think if a <span
            className="strong">Service</span> is not correct configured.
        </section>]

}
