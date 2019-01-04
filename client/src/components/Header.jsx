import React from "react";
import I18n from "i18n-js";
import {Link} from "react-router-dom";
import logo from "../images/surflogo.png";
import "./Header.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import LanguageSelector from "./LanguageSelector";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default class Header extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            dropDownActive: false
        };
    }

    renderProfileLink(currentUser) {
        return (
            <p className="welcome-link">
                <i className="fa fa-user-circle-o"></i>
                {currentUser.display_name}
            </p>
        );
    }

    login = e => {
        stopEvent(e);
        window.location.href = "/login";
    };

    render() {
        let currentUser = this.props.currentUser;
        if (isEmpty(currentUser)) {
            currentUser = {display_name: "John Doe"}
        }
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""}`}>
                <div className="header">
                    <Link to="/" ><img className="logo" src={logo} alt=""/></Link>

                    <p className="title first">{I18n.t("header.title")}</p>
                    <ul className="links">
                        {currentUser.guest && <li className="item">
                            <a href="#login" onClick={this.login}>{I18n.t("header.links.login")}</a>
                        </li>}
                        <li>
                            <LanguageSelector currentUser={currentUser}/>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}
