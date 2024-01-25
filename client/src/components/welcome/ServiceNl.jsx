import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function ServiceNl(role) {

    const responsibilities = role === ROLES.SERVICE_ADMIN ? [
        "De configuratie van de dienst bekijken en beheren",
        "De acceptable use policy en privacy policy van de dienst beheren",
        "Beheer welke organisaties en samenwerkingen deze dienst kunnen gebruiken",
        "De LDAP-informatie bekijken en het bind password instellen",
        "Dienstbeheerders van deze dienst beheren"
    ] : [
        "Koppelverzoeken beheren",
        "Samenwerkingen ontkoppelen"
    ]
    return (
        <div className="welcome">
            <div>
                <p>Als {role === ROLES.SERVICE_ADMIN ? "dienstbeheerder" : "dienstmanager"} kun je het volgende doen:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
