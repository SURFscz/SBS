import React from "react";

export default function ImpersonateExplanation() {
    return [
        <section key={1} className="explanation">
            As a <span className="strong">super user</span> you can impersonate a different user. You will see the application exactly as that user- with the only exception of the
            <span className="emphasize"> Impersonate</span> menu item.
        </section>,
        < section key={2} className="example">
            For example impersonating a regular member of a collaboration will limit the view to the
            <span className="emphasize"> User Service Profiles</span> of that user.
        </section>,
        <section key={3} className="details">
            The impersonation is done by sending custom headers to the server which will only be interpreted if you
            are a <span className="strong">super user</span>.
        </section>]

}
