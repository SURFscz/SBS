import React from "react";
import I18n from "i18n-js";
import {Link, NavLink} from "react-router-dom";
import logo from "../images/surflogo.png";
import "./Header.scss";
import {stopEvent} from "../utils/Utils";
import LanguageSelector from "./LanguageSelector";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import UserProfile from "./UserProfile";
import ReactTooltip from "react-tooltip";

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
                {/*<FontAwesomeIcon icon="user-ninja"/>*/}
                {currentUser.name}
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

    login = e => {
        stopEvent(e);
        window.location.href = "/login";
    };

    render() {
        const {currentUser, impersonator} = this.props;
        const displayLogin = currentUser.guest && !window.location.pathname.startsWith("/registration");
        return (
            <div className={`header-container`}>
                <div className="header">
                    <Link to="/"><img className="logo" src={logo} alt=""/></Link>

                    <p className="title first">{I18n.t("header.title")}</p>
                    <ul className="links">
                        {displayLogin && <li className="login">
                            <a href="#login" onClick={this.login}>{I18n.t("header.links.login")}</a>
                        </li>}
                        {impersonator && <li className="impersonator">
                            <NavLink to="/impersonate">
                            <span data-tip data-for="impersonator">
                                <FontAwesomeIcon icon="user-secret"/></span>
                                <ReactTooltip id="impersonator" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{
                                        __html: I18n.t("header.impersonator", {
                                            currentUser: currentUser.name,
                                            impersonator: impersonator.name
                                        })
                                    }}/>
                                </ReactTooltip>
                            </NavLink>
                        </li>}
                        <li className={`user-profile ${(displayLogin || impersonator) ? "border-left" : ""}`}>
                            {this.renderProfileLink(currentUser)}
                            {this.renderDropDown(currentUser)}
                        </li>
                        <li className="help border-left">
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
