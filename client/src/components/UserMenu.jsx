import I18n from "i18n-js";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";

//https://stackoverflow.com/questions/32553158/detect-click-outside-react-component
export default function UserMenu({currentUser}) {
    const links = ["profile", "logout"];
    const adminLinks = ["system","impersonate",
]
    return (
        <div className="user-menu">
            <ul>
                {links.map(l => <li>
                    <Link to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                </li>)}
                {currentUser.admin && adminLinks.map(l => <li>
                    <Link to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                </li>)}
            </ul>
        </div>
    );
}
