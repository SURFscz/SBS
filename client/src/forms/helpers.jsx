import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";

export function headerIcon(column, sorted, reverse) {
    if (column.nonSortable) {
        return null;
    }
    if (column.key === sorted) {
        return reverse ? <FontAwesomeIcon icon="caret-up" className="reverse"/> :
            <FontAwesomeIcon icon="caret-down" className="current"/>
    }
    return null;
}
