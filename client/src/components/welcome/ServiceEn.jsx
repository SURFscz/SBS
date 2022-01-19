import React from "react";

import "./welcome.scss";

export default function ServiceEn() {

    const responsibilities = [
        "View and edit its properties",
        "Configure the service AUP and Privacy Policy",
        "View which organisations and collaborations can use this service",
        "View LDAP information and set the bind password",
        "Manage other service admins for this service"
    ]
    return (
        <div className="welcome">
            <div>
                <p>As a service admin, you can:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
