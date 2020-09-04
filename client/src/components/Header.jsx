import React from "react";
import I18n from "i18n-js";
import {Link, NavLink} from "react-router-dom";
// import logo from "../images/surflogo.png";
import logo from "../images/logo-surf-orange.svg";
import "./Header.scss";
import {stopEvent} from "../utils/Utils";
import LanguageSelector from "./LanguageSelector";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import UserProfile from "./UserProfile";
import ReactTooltip from "react-tooltip";
import {login, logout} from "../utils/Login";

export default class Header extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            dropDownActive: false
        };
    }

    renderProfileLink(currentUser) {
        return (
            <a href="/profile" className="welcome-link" onClick={this.handleToggle}>
                <span>{currentUser.name}</span>
                {this.renderDropDownIndicator()}
            </a>
        );
    }

    handleToggle = e => {
        stopEvent(e);
        this.setState({dropDownActive: !this.state.dropDownActive});
    };

    renderDropDownIndicator = () => this.state.dropDownActive ? <FontAwesomeIcon icon="caret-up"/> :
        <FontAwesomeIcon icon="caret-down"/>;


    renderDropDown = currentUser => this.state.dropDownActive ? <UserProfile currentUser={currentUser}/> : null;

    render() {
        const {currentUser, impersonator} = this.props;
        const displayLogin = currentUser.guest;
        return (
            <div className={`header-container`}>
                <div className="header">
                    <Link to="/"><img className="logo" src={logo} alt=""/></Link>

                    <h1 className="title first">{I18n.t("header.title")}</h1>
                    <ul className="links">
                        {displayLogin && <li className="login">
                            <a href="/login" onClick={login}>{I18n.t("header.links.login")}</a>
                        </li>}
                        {!displayLogin && <li className="login">
                            <a href="/logout" onClick={logout}>{I18n.t("header.links.logout")}</a>
                        </li>}

                        {impersonator && <li className="impersonator border-left">
                            <NavLink to="/impersonate">
                            <span data-tip data-for="impersonator">
                                <FontAwesomeIcon icon="user-secret"/></span>
                                <ReactTooltip id="impersonator" type="light" effect="solid" data-html={true}
                                              place="bottom">
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("header.impersonator", {
                                            currentUser: currentUser.name,
                                            impersonator: impersonator.name
                                        })
                                    }}/>
                                </ReactTooltip>
                            </NavLink>
                        </li>}
                        {!currentUser.guest &&
                        <li className="user-profile">
                            {this.renderProfileLink(currentUser)}
                            {this.renderDropDown(currentUser)}
                        </li>}
                        <li className="help">
                            <a href={I18n.t("header.links.helpUrl")} rel="noopener noreferrer"
                               target="_blank">{I18n.t("header.links.help")}</a>
                        </li>
                        <li>
                            <LanguageSelector currentUser={currentUser}/>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}
