import React from "react";
import I18n from "i18n-js";
import "./UserColumn.scss";
import {Tooltip} from "@surfnet/sds";

export default function UserColumn({entity, currentUser, gotoInvitation, hideEmail = false, showMe = true}) {
    if (!entity.invite && !entity.user) {
        return null;
    }

    return (
        <div className="user-name-email-container">
            <Tooltip tip={entity.invite ? entity.invitee_email : entity.user && entity.user.username}
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
            <span className="person-role me">{I18n.t("models.users.me")}</span>}
        </div>
    );
}

