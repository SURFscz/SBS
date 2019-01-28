import React from "react";
import I18n from "i18n-js";
import "./UserProfile.scss";

export default function UserProfile({currentUser}) {
    return (
        <ul className="user-profile">
            <li>
                <span>{`${I18n.t("profile.name")}:`}</span>
                <span className="value">{currentUser.name}</span>
            </li>
            <li>
                <span>{`${I18n.t("profile.email")}:`}</span>
                <span className="value">{currentUser.email}</span>
            </li>
            <li>
                <span>{`${I18n.t("profile.uid")}:`}</span>
                <span className="value">{currentUser.uid}</span>
            </li>
            <li>
                <span>{`${I18n.t("profile.role")}:`}</span>
                <span className="value">{I18n.t(`profile.${currentUser.admin ? "admin" : "noadmin"}`)}</span>

            </li>
        </ul>);

}

