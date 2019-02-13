import React from "react";
import I18n from "i18n-js";
import {Link, NavLink} from "react-router-dom";
import logo from "../images/surflogo.png";
import "./Header.scss";
import {isEmpty, pseudoGuid, stopEvent} from "../utils/Utils";
import LanguageSelector from "./LanguageSelector";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import UserProfile from "./UserProfile";
import ReactTooltip from "react-tooltip";
import {getParameterByName} from "../utils/QueryParameters";

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
        const state = getParameterByName("state", window.location.search);
        const guid = pseudoGuid();
        const queryParameter = isEmpty(state) ? `?guid=${guid}` : `?guid=${guid}&state=${encodeURIComponent(state)}`;
        window.location.href = `/login${queryParameter}`;
    };

    logout = e => {
        stopEvent(e);
        const baseUrl = this.props.config.base_url;
        const guid = pseudoGuid();
        window.location.href = `/redirect_uri?logout=${baseUrl}&guid=${guid}`;
    };

    render() {
        const {currentUser, impersonator} = this.props;
        const displayLogin = currentUser.guest;
        return (
            <div className={`header-container`}>
                <div className="header">
                    <Link to="/"><img className="logo" src={logo} alt=""/></Link>

                    <p className="title first">{I18n.t("header.title")}</p>
                    <ul className="links">
                        {displayLogin && <li className="login">
                            <a href="/login" onClick={this.login}>{I18n.t("header.links.login")}</a>
                        </li>}
                        {!displayLogin && <li className="login">
                            <a href="/logout" onClick={this.logout}>{I18n.t("header.links.logout")}</a>
                        </li>}

                        {impersonator && <li className="impersonator border-left">
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
                        {!currentUser.guest &&
                        <li className="user-profile border-left">
                            {this.renderProfileLink(currentUser)}
                            {this.renderDropDown(currentUser)}
                        </li>}
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
