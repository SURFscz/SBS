import React from "react";

import "./welcome.scss";

export default function ServiceNl() {

    const responsibilities = [
        "Dienstbeheerders van deze dienst beheren",
        "De acceptable use policy en privacy policy van de dienst beheren"
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
