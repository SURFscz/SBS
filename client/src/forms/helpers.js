import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";

export function headerIcon(name, sorted, reverse) {
    if (name === "actions" || name === "open") {
        return null;
    }
    if (name === sorted) {
        return reverse ? <FontAwesomeIcon icon="arrow-up" className="reverse"/> :
            <FontAwesomeIcon icon="arrow-down" className="current"/>
    }
    return <FontAwesomeIcon icon="arrow-down"/>;
}
