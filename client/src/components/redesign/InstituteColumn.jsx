import React from "react";
import I18n from "i18n-js";
import "./InstituteColumn.scss";
import {Tooltip} from "@surfnet/sds";

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
            <Tooltip tip={I18n.t(`models.users.${isMe ? 'instituteUnknownMeTooltip' : 'instituteUnknownTooltip'}`)}/>
            </div>}
        </div>
    );
}

