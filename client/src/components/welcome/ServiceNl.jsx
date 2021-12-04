import React from "react";

import "./welcome.scss";

export default function ServiceNl() {

    const responsibilities = [
        "Beheer andere dienstbeheerders voor deze dienst",
        "Configureer de dienst AUP en privacy policy"
    ]
    return (
        <div className="welcome">
            <div>
                <p>Als een dienstbeheerder kan je de volgende dingen doen:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
