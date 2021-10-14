import React from "react";

import "./welcome.scss";
import {ROLES} from "../../utils/UserRole";

export default function CollaborationEn({role}) {

    const responsibilities = [
        "Manage collaboration details",
        "Manage groups for this collaboration",
        "Manage administrators or members for this collaboration",
        "Manage services for this collaboration"
    ]
    return (
        <div className="welcome"> {role === ROLES.COLL_MEMBER  && <div>
            <p>As a member of a collaboration, you can access all services that are connected to this
                collaboration. Accounts for you have been created automatically.</p>
            <p>As a member you can also see your fellow members and contact details.</p>
            <p className="no-margin">Happy researching!</p>
        </div>}
            {role === ROLES.COLL_ADMIN  && <div>
                <p>As an collaboration admin, here's what you can do:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>}
        </div>
    );
}
