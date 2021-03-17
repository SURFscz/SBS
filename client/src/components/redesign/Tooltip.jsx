import React from "react";
import "./Tooltip.scss";
import ReactTooltip from "react-tooltip";

export default function Tooltip({children, id, msg}) {
    return (
        <span className="tooltip-wrapper" data-tip data-for={id}>
                                    {children}
            <ReactTooltip id={id} type="light" effect="solid" data-html={true}>
                <span className="tooltip-wrapper-inner" dangerouslySetInnerHTML={{__html: msg}}/>
            </ReactTooltip>
        </span>
    );
}