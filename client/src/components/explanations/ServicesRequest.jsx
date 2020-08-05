import React from "react";

export default function ServicesRequestExplanation({name}) {
    return [
        <section key={1} className="explanation">
            The service <span className="strong">{name}</span> redirected you to this page as you can not use
            this service unless you add it to one of your collaborations.
        </section>,
        <section key={3} className="details">
            Decide to which collaboration you would like to add the service  <span className="strong">{name}</span>.
        </section>,
        < section key={2} className="example">
            If the service <span className="strong">{name}</span> is configured to require manual approval of the
            Service owner
            we will create a <span className="strong">Service Connection Request</span> which needs to be approved
            before you can use this service.
        </section>,
        <section key={4} className="details">
            Please contact
            <a href="mailto:sram-support@surf.nl"> sram-support@surf.nl</a> if you have any questions.
        </section>]

}
