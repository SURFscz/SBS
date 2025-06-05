import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function ServiceEn({role}) {

    const responsibilities = role === ROLES.SERVICE_ADMIN ? [
            "View and edit its properties",
            "Configure the application AUP and Privacy Policy",
            "Manage which organisations and collaborations can use this application",
            "View LDAP information and set the bind password",
            "Manage other application admins for this application"
        ] :
        [
            "Manage connection requests for the Service",
            "Disconnect collaborations from the Service"
        ]
    return (
        <div className="welcome">
            <div>
                <p>As an application {role === ROLES.SERVICE_ADMIN ? "admin" : "manager"}, you can:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
