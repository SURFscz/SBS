import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function ServiceNl(role) {

    const responsibilities = role === ROLES.SERVICE_ADMIN ? [
        "De configuratie van de applicatie bekijken en beheren",
        "De acceptable use policy en privacy policy van de applicatie beheren",
        "Beheer welke organisaties en samenwerkingen deze applicatie kunnen gebruiken",
        "De LDAP-informatie bekijken en het bind password instellen",
        "Applicatiebeheerders van deze applicatie beheren"
    ] : [
        "Koppelaanvraag beheren",
        "Samenwerkingen ontkoppelen"
    ]
    return (
        <div className="welcome">
            <div>
                <p>Als {role === ROLES.SERVICE_ADMIN ? "applicatiebeheerder" : "applicatiemanager"} kun je het volgende doen:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
