import React from "react";

import "./welcome.scss";

export default function ServiceEn() {

    const responsibilities = [
        "Manage other service admins for this service",
        "Configure the service AUP and Privacy Policy"
    ]
    return (
        <div className="welcome">
            <div>
                <p>As a service admin, you can:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
