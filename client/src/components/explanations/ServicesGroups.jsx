import React from "react";

export default function ServiceGroupsExplanation() {
    return [
        <section key={1} className="explanation">
            You can add <span className="strong">Groups</span> to your <span
            className="strong">Service </span> and these <span className="strong">Groups </span>
            will be created in every <span className="strong">Collaboration</span> where this <span
            className="strong">Groups </span>
            is connected to.
        </section>,
        <section key={2} className="details">
            If the <span className="strong">Group</span> is configured to auto provision members
            then all <span className="strong">Members</span> of the <span className="strong">Collaboration</span> are
            automatically added to the <span className="strong">Group</span>.
        </section>
    ]

}
