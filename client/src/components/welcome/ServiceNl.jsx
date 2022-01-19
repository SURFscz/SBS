import React from "react";

import "./welcome.scss";

export default function ServiceNl() {

    const responsibilities = [
        "De configuratie van de dienst bekijken en beheren",
        "De acceptable use policy en privacy policy van de dienst beheren",
        "Zien welke organisaties en samenwerkingen deze dienst kunnen gebruiken",
        "De LDAP-informatie bekijken en het bind password instellen",
        "Dienstbeheerders van deze dienst beheren"
    ]
    return (
        <div className="welcome">
            <div>
                <p>Als dienstbeheerder kun je het volgende doen:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
