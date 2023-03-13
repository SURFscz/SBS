import I18n from "i18n-js";
import React, {useState} from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {logout} from "../../utils/Login";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {isEmpty} from "../../utils/Utils";
import {clearFlash} from "../../utils/Flash";
import {UserInfo} from "@surfnet/sds";
import {AppStore} from "../../stores/AppStore";


export const UserMenu = ({currentUser, organisation, config, provideFeedback}) => {

    const [dropDownActive, setDropDownActive] = useState(false);

    const {actions, objectRole} = AppStore.useState(state => state);

    const toggleUserMenu = () => {
        setDropDownActive(false);
        clearFlash();
    }

    const renderMenu = (adminLinks, collCreateAllowed, provideFeedback, collMenuItemRequired) => {
        return (<>
                <ul>
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={toggleUserMenu} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    {collMenuItemRequired && <li>
                        <Link onClick={toggleUserMenu} to={`/new-collaboration`}>
                            {I18n.t(`header.links.${collCreateAllowed ? "createCollaboration" : "requestCollaboration"}`)}
                        </Link>
                    </li>}
                    <li>
                        <Link onClick={toggleUserMenu} to={`/profile`}>{I18n.t(`header.links.profile`)}</Link>
                    </li>
                    {config.feedback_enabled && <li>
                        <a href="/feedback" onClick={provideFeedback}>{I18n.t(`header.links.feedback`)}</a>
                    </li>}
                    {actions.map(action => <li key={action.name}>
                        <a href={`/${action.name}`} onClick={action.perform}>{action.name}</a>
                    </li>)}
                </ul>
                <ul>
                    <li>
                        <a href="/logout" onClick={logout}>{I18n.t(`header.links.logout`)}</a>
                    </li>
                </ul>
            </>
        )
    }

    const adminLinks = ["system"];
    if (config.impersonation_allowed) {
        adminLinks.push("impersonate")
    }
    const lessThenOrgManager = !isUserAllowed(ROLES.ORG_MANAGER, currentUser);
    const collMenuItemRequired = lessThenOrgManager && !isEmpty(organisation) && organisation.has_members
    const collCreateAllowed = !isEmpty(organisation)
        && (organisation.collaboration_creation_allowed_entitlement || organisation.collaboration_creation_allowed);
    const organisationPart = organisation ? organisation.name : "";
    const organisationName = objectRole || organisationPart;
    return (
        <div className="user-menu"
             tabIndex={1}
             onBlur={() => setTimeout(() => setDropDownActive(false), 250)}>
            <UserInfo isOpen={dropDownActive}
                      children={renderMenu(adminLinks, collCreateAllowed, provideFeedback, collMenuItemRequired, config)}
                      organisationName={organisationName}
                      userName={currentUser.name}
                      toggle={() => setDropDownActive(!dropDownActive)}
            />
        </div>
    );


}
