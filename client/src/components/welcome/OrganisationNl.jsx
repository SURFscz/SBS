import React from "react";

import I18n from "../../locale/I18n";
import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function OrganisationEn({role}) {

    const responsibilities = [
        "Organisatiedetails beheren",
        "Samenwerkingen in deze organisatie beheren",
        "Groepen in samenwerkingen beheren",
        "Leden van samenwerkingen van deze organisatie beheren"
    ]
    if (role === ROLES.ORG_ADMIN) {
        responsibilities.push("Beheer gebruikers in deze organisatie");
    }
    return (
        <div className="welcome">
            <p>Als een {I18n.t(`access.${role}`).toLowerCase()} kan je het volgende doen:</p>
            <ul>
                {responsibilities.map((r,i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    );
}
