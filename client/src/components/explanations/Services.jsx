import React from "react";

export default function ServicesExplanation() {
    return [
        <section key={1} className="explanation">
            Before you can use existing <span className="strong">Services</span> in your <span
            className="strong">Collaboration </span>
            you must add them to your <span className="strong">Collaboration</span>.
        </section>,
        < section key={2} className="example">
            If the <span className="strong">Service</span> is configured to require manual approval of the Service owner
            you need to send a <span className="strong">Service Connection Request.</span>
        </section>,
        <section key={3} className="details">
            If the <span className="strong">Service</span> is configured to have limited access to specific <span
            className="strong">Organisations </span>
            you can not add the service to your <span className="strong">Collaboration</span> unless the
            <span className="strong"> Collaboration</span> belongs to the <span className="strong">Organisation </span>
            that is granted access to the <span className="strong">Service</span>.
        </section>,
        <section key={4} className="details">
            Please contact
            <a href="mailto:scz-support@surfnet.nl"> scz-support@surfnet.nl</a> if you think if a <span
            className="strong">Service</span> is not correct configured.
        </section>]

}
