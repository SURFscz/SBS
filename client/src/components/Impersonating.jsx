import {NavLink} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import I18n from "i18n-js";
import React from "react";

export default function Impersonating({impersonator, currentUser}) {

    return <div className="impersonator ">
        <NavLink to="/impersonate">
                            <span data-tip data-for="impersonator">
                                <FontAwesomeIcon icon="user-secret"/></span>
            <ReactTooltip id="impersonator" type="light" effect="solid" data-html={true}
                          place="bottom">
                <p dangerouslySetInnerHTML={{
                    __html: I18n.t("header.impersonator", {
                        currentUser: currentUser.name,
                        impersonator: impersonator.name
                    })
                }}/>
            </ReactTooltip>
        </NavLink>
    </div>
}
