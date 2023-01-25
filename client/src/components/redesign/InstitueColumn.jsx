import React from "react";
import I18n from "i18n-js";
import "./InstituteColumn.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import { Tooltip as ReactTooltip } from "react-tooltip";

export default function InstituteColumn({entity, currentUser, greyed=true}) {
    const isMe = !entity.invite && entity.user.id === currentUser.id;
    let txt;
    if (entity.invite) {
        txt = "";
    } else {
        txt = entity.user.schac_home_organisation || I18n.t("models.users.instituteUnknown");
        greyed = greyed && !entity.user.schac_home_organisation;
    }
    return (
        <div className={`institute-column ${greyed ? 'greyed' : ''}`}>
            <span>{txt}</span>
            {(isMe && !entity.user.schac_home_organisation) && <div>
            <span data-tip data-for="user-institution">
                        <FontAwesomeIcon icon="info-circle"/>
                    </span>
                <ReactTooltip id="user-institution" type="info" effect="solid" data-html={true}>
                    <span>{I18n.t(`models.users.${isMe ? 'instituteUnknownMeTooltip' : 'instituteUnknownTooltip'}`)}</span>
                </ReactTooltip>
            </div>}
        </div>
    );
}

