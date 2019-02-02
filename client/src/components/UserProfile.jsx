import React from "react";
import I18n from "i18n-js";
import "./UserProfile.scss";
import CheckBox from "./CheckBox";

export default function UserProfile({currentUser}) {
    const organisationMemberships = currentUser.organisation_memberships || [];
    const organisationAdmins = organisationMemberships.filter(membership => membership.role === "admin");
    const organisationMembers = organisationMemberships.filter(membership => membership.role === "member");

    const collaborationMemberships = currentUser.collaboration_memberships || [];
    const collaborationAdmins = collaborationMemberships.filter(membership => membership.role === "admin");
    const collaborationMembers = collaborationMemberships.filter(membership => membership.role === "member");

    const showOrganisations = organisationAdmins.length > 0 || organisationMembers.length > 0;
    const showCollaborations = collaborationAdmins.length > 0 || collaborationMembers.length > 0;
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
            {showCollaborations &&
            <ul>
                <li>
                    <span className="section">{I18n.t("profile.collaborations")}</span>
                </li>
                {collaborationAdmins.concat(collaborationMembers).map(membership =>
                    <li>
                        <span>{membership.collaboration.name}</span>
                        <span className="value">{I18n.t(`profile.${membership.role}`)}</span>
                    </li>
                )}

            </ul>
            }
            {showOrganisations &&
            <ul>
                <li>
                    <span className="section">{I18n.t("profile.organisations")}</span>
                </li>
                {organisationAdmins.concat(organisationMembers).map(membership =>
                    <li>
                        <span>{membership.organisation.name}</span>
                        <span className="value">{I18n.t(`profile.${membership.role}`)}</span>
                    </li>
                )}
            </ul>
            }
            {currentUser.admin && <ul>
                <li>
                    <span className="section">{I18n.t("profile.sbs")}</span>
                </li>
                <li>
                    <span>{`${I18n.t("profile.superUser")}:`}</span>
                    <span className="value">{<CheckBox name="super-user" value={true} readOnly={true}/>}</span>
                </li>
            </ul>}
        </ul>);

}

