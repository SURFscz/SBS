import React from "react";
import I18n from "i18n-js";
import "./UserProfile.scss";
import CheckBox from "./CheckBox";
import {isEmpty} from "../utils/Utils";

function addUserAttribute(user, attribute, index, split = false) {
    return isEmpty(user[attribute]) ? null : <li key={index}>
        <span>{`${I18n.t(`profile.${attribute}`)}:`}</span>
        {split ? <span className="value">
                    <ul className="split-values">
                        {user[attribute].split(",").map((part, index) => <li key={index} className="value">{part}</li>)}
                    </ul>
                </span> : <span className="value">{user[attribute]}</span>}
    </li>;
}

export default function UserProfile({currentUser}) {
    const organisationMemberships = currentUser.organisation_memberships || [];
    const organisationAdmins = organisationMemberships.filter(membership => membership.role === "admin");
    const organisationMembers = organisationMemberships.filter(membership => membership.role === "member");

    const collaborationMemberships = currentUser.collaboration_memberships || [];
    const collaborationAdmins = collaborationMemberships.filter(membership => membership.role === "admin");
    const collaborationMembers = collaborationMemberships.filter(membership => membership.role === "member");

    const showOrganisations = organisationAdmins.length > 0 || organisationMembers.length > 0;
    const showCollaborations = collaborationAdmins.length > 0 || collaborationMembers.length > 0;
    const attributes = ["name", "email", "uid", "affiliation", "nick_name", "schac_home_organisation", "edu_members"];
    const splitAttributes = ["edu_members"];
    return (
        <ul className="user-profile">
            {attributes.map((attr, index) => addUserAttribute(currentUser, attr, index, splitAttributes.includes(attr)))}
            {showCollaborations &&
            <ul>
                <li>
                    <span className="section">{I18n.t("profile.collaborations")}</span>
                </li>
                {collaborationAdmins.concat(collaborationMembers).map((membership, index) =>
                    <li key={index}>
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
                {organisationAdmins.concat(organisationMembers).map((membership, index )=>
                    <li key={index}>
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

