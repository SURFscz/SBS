import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";
import I18n from "../../locale/I18n";

export default function OrganisationEn({role}) {

    const responsibilities = [
        "Manage organisation details",
        "Manage collaborations for this organisation",
        "Manage groups within collaborations",
        "Manage administrators or members for collaborations of this organisation"
    ]
    if (role === ROLES.ORG_ADMIN) {
        responsibilities.push("Manage administrators or manager for this organisation");
    }
    return (
        <div className="welcome">
            <p>As a {I18n.t(`access.${role}`).toLowerCase()}, here's what you can do:</p>
            <ul>
                {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    );
}
