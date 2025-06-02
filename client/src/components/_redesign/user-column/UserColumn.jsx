import React from "react";
import I18n from "../../../locale/I18n";
import "./UserColumn.scss";
import {ChipType, Chip, Tooltip} from "@surfnet/sds";
import {dateFromEpoch} from "../../../utils/Date";

export default function UserColumn({entity, currentUser, gotoInvitation, hideEmail = false, showMe = true}) {
    if (!entity.invite && !entity.user) {
        return null;
    }
    return (
        <div className="user-name-email-container">
            <Tooltip tip={entity.invite ?
                I18n.t("models.users.inviteTooltip", {
                    email: entity.invitee_email,
                    name: entity.user ? entity.user.name : entity.created_by,
                    date: dateFromEpoch(entity.created_at)
                }) :
                entity.user && entity.created_at ? I18n.t("models.users.userTooltip", {
                    username: entity.user.username,
                    date: dateFromEpoch(entity.created_at)
                }) : entity.user.username}
                     standalone={true}
                     children={
                         <div className="user-name-email">
                             <span className="name">{entity.invite ? "-" : entity.user && entity.user.name}</span>
                             {entity.invite &&
                             <span className="email">
                    {gotoInvitation && <a href="/invite" onClick={gotoInvitation(entity)}>{entity.invitee_email}</a>}
                                 {!gotoInvitation && <span>{entity.invitee_email}</span>}
                </span>}
                             {(!entity.invite && !hideEmail) &&
                             <span className="email">{entity.user && entity.user.email}</span>}
                         </div>}/>
            {(showMe && !entity.invite && entity.user.id === currentUser.id) &&
                <Chip type={ChipType.Main_400} label={I18n.t("models.users.me")} />}
        </div>
    );
}
