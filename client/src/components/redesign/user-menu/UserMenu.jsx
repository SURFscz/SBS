import I18n from "../../../locale/I18n";
import React, {useState} from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {logout} from "../../../utils/Login";
import {clearFlash} from "../../../utils/Flash";
import {UserInfo} from "@surfnet/sds";
import {AppStore} from "../../../stores/AppStore";
import {stopEvent} from "../../../utils/Utils";
import {isUserAllowed, isUserServiceAdmin, ROLES} from "../../../utils/UserRole";


export const UserMenu = ({currentUser, config, provideFeedback}) => {

    const [dropDownActive, setDropDownActive] = useState(false);

    const {actions, objectRole} = AppStore.useState(state => state);

    const toggleUserMenu = () => {
        setDropDownActive(false);
        clearFlash();
    }

    const savePerform = action => e => {
        stopEvent(e);
        action.perform();
    }

    const renderMenu = (adminLinks, provideFeedback) => {
        const userServiceAdmin = isUserServiceAdmin(currentUser);
        const showBulkUpload = isUserAllowed(ROLES.ORG_MANAGER, currentUser);
        return (
            <>
                <ul>
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={toggleUserMenu} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    <li>
                        <Link onClick={toggleUserMenu} to={`/profile`}>{I18n.t(`header.links.profile`)}</Link>
                    </li>
                    {(!userServiceAdmin || currentUser.admin) && <li>
                        <Link onClick={toggleUserMenu} to={`/new-service-request`}>
                            {I18n.t("header.links.requestService")}
                        </Link>
                    </li>}
                    {showBulkUpload && <li>
                        <Link onClick={toggleUserMenu} to={`/bulk-upload`}>
                            {I18n.t("header.links.bulkUpload")}
                        </Link>
                    </li>}

                </ul>
                <ul>
                    {config.feedback_enabled && <li>
                        <a href="/feedback" onClick={provideFeedback}>{I18n.t(`header.links.feedback`)}</a>
                    </li>}
                    {actions.map(action =>
                        <li key={action.name}>
                            <a href={`/${action.name}`} onClick={savePerform(action)}>{action.name}</a>
                        </li>)}
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
    return (
        <div className="user-menu"
             tabIndex={1}
             onBlur={() => setTimeout(() => setDropDownActive(false), 250)}>
            <UserInfo isOpen={dropDownActive}
                      children={renderMenu(adminLinks, provideFeedback)}
                      organisationName={objectRole || ""}
                      userName={currentUser.name}
                      toggle={() => setDropDownActive(!dropDownActive)}
            />
        </div>
    );


}
