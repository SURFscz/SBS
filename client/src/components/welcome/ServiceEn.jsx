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
                <p>As an service admin, here's what you can do:</p>
                <ul>
                    {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}
