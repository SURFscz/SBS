import React from "react";

export default function ScimExplanation() {
    return [
        <section key={1} className="explanation">
            The <span className="strong">SCIM</span> implementation in SRAM will inform any
            <span className="strong"> Service</span> where SCIM notification is enabled, of changes in
            group and collaboration memberships.
        </section>,
        <section key={2} className="details">
            For testing purposes there is mock implementation of a remote SCIM client in SRAM. If a <span
            className="strong">Service</span> is configured with this mock endpoint, then all changes in collaboration
            and group membership in collaborations that are connected to this <span className="strong">Service</span> are
            propagated to this endpoint.
        </section>,
        < section key={3} className="example">
            All POST (new SCIM objects), PUT (updated SCIM objects) and DELETE (deleted SCIM objects) messages are stored in memory. To test the SCIM
            functionality configure one of more
            services with the mock SCIM endpoint and start making changes to collaborations, groups and memberships that are
            connected to one
            of those services. Then fetch the statistics and validate the database and content in the JSON root element.
        </section>,
        <section key={4} className="details">
            The statistics <code>root</code> contains <code>database</code> (the in-memory
            content per service) and <code>http_calls</code> (all incoming HTTP-calls per service).
        </section>,
    ];
}
