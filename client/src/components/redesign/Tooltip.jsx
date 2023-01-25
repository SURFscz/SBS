import React from "react";
import "./Tooltip.scss";
import {Tooltip as SDSTooltip} from "@surfnet/sds";

export default function Tooltip({children, id, msg}) {
    return (
        <SDSTooltip children={children} tip={msg} anchorId={id}/>
    );
}