import React from "react";
import I18n from "i18n-js";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/logo.svg";
import "./Header.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import UserMenu from "./redesign/UserMenu";
import {globalUserRole} from "../utils/UserRole";

export default class Header extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            v: false
        };
    }

    renderProfileLink(currentUser) {
        return (
            <div className="menu" onClick={() => this.setState({dropDownActive: !this.state.dropDownActive})}>
                <div className="user">
                    <span>{currentUser.name}</span>
                    <span className="role">{globalUserRole(currentUser)}</span>
                </div>
                {this.renderDropDownIndicator()}
            </div>
        );
    }

    renderDropDownIndicator = () => this.state.dropDownActive ? <FontAwesomeIcon icon="angle-up"/> :
        <FontAwesomeIcon icon="angle-down"/>;


    render() {
        const {currentUser} = this.props;
        const {dropDownActive} = this.state;
        return (
            <div className="header-container">
                <div className="header">
                    <Link className="logo" to="/"><Logo/></Link>

                    <h1 className="title">{I18n.t("header.title")}</h1>
                    {!currentUser.guest && <div className="user-profile">
                        {this.renderProfileLink(currentUser)}
                        {dropDownActive && <UserMenu currentUser={currentUser} close={() => this.setState({dropDownActive: false})}/>}
                    </div>}
                </div>
            </div>
        );
    }
}
