import React from "react";
import I18n from "i18n-js";
import "./UserColumn.scss";

export default function UserColumn({entity, currentUser, gotoInvitation}) {
    return (
        <div className="user-name-email-container">
            <div className="user-name-email">
                <span className="name">{entity.invite ? "-" : entity.user.name}</span>
                {entity.invite &&
                <span className="email">
                    <a href="" onClick={gotoInvitation && gotoInvitation(entity)}>{entity.invitee_email}</a>
                </span>}
                {!entity.invite && <span className="email">{entity.user.email}</span>}

            </div>
            {(!entity.invite && entity.user.id === currentUser.id) &&
            <span className="person-role me">{I18n.t("models.users.me")}</span>}
        </div>
    );
}
