import React from "react";
import I18n from "../../../locale/I18n";
import "./InstituteColumn.scss";
import {Tooltip} from "@surfnet/sds";
import {isEmpty} from "../../../utils/Utils";

export default function InstituteColumn({entity, currentUser, greyed=true, organisation=null}) {
    const isMe = !entity.invite && entity.user.id === currentUser.id;
    let txt;
    if (entity.invite) {
        txt = "";
    } else if (!isEmpty((organisation))) {
        txt = organisation.name;
    } else {
        txt = entity.user.schac_home_organisation || I18n.t("models.users.instituteUnknown");
        greyed = greyed && !entity.user.schac_home_organisation && !organisation;
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
