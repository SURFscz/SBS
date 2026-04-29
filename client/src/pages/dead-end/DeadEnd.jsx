import React from "react";
import NoAccess from "../../lotties/undraw_access_denied.svg?react";
import "../server-error/ServerError.scss";

export default function DeadEnd() {
    return (
        <div className="mod-server-error">
            <div className="content">
                <NoAccess/>
            </div>
        </div>
    );
}
