import React from "react";

import I18n from "i18n-js";
import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function OrganisationEn({role}) {

    const responsibilities = [
        "Beheer organisatie details",
        "Beheer samenwerkingen in deze organisatie",
        "Beheer groepen in samenwerkingen",
        "Beheer gebruikers in samenwerkingen van deze organisatie"
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
