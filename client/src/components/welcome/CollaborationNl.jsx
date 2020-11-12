import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function CollaborationNL({role}) {

    const responsibilities = [
        "Beheer de details van deze samenwerking",
        "Bheer groepen in deze samenwerking",
        "Beheer gebruikers in deze samenwerking",
        "Beheer diensten voor deze samenwerking"
    ]
    return (
        <div className="welcome"> {role === ROLES.COLL_MEMBER && <div>
            <p>Als een gebruiker van een samenwerking heb je toegang tot alle diensten die zijn
                gekoppeld aan deze samenwerking. Accounts zijn automatisch voor je aangemaakt.</p>
            <p>Als een gebruiker kan je ook de mede-gebruikers en hun contactgegevens bekijken.</p>
            <p>Happy researching!</p>
        </div>}
            {role === ROLES.COLL_ADMIN}
            <p>Als een samenwerkings admin kan je het volgende doen:</p>
            <ul>
                {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    );
}
