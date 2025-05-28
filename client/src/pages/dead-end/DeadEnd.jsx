import React from "react";
import {ReactComponent as NoAccess} from "../../lotties/undraw_access_denied.svg";
import "../ServerError.scss";

export default function DeadEnd() {
    return (
        <div className="mod-server-error">
            <div className="content">
                <NoAccess/>
            </div>
        </div>
    );
}
