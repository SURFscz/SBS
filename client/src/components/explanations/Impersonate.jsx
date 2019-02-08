import React from "react";

export default function ImpersonateExplanation() {
    return [
        <section className="explanation">
            As a super user you can impersonate a different user. You will see the application exactly as that user- with the only exception of the
            <span className="emphasize"> Impersonate</span> menu item.
        </section>,
        < section className="example">
            For example impersonating a regular member of a collaboration will limit the view to the
            <span className="emphasize"> User Service Profiles</span> of that user.
        </section>,
        <section className="details">
            The impersonation is done by sending custom headers to the server which will only be interpreted if the
            user is a <span className="strong">Super-User</span>.
        </section>]

}
