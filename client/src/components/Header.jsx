import React from "react";
import I18n from "i18n-js";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/surf.svg";
import "./Header.scss";
import UserMenu from "./redesign/UserMenu";
import {ReactComponent as ChevronDown} from "../icons/chevron-down.svg";
import {ReactComponent as ChevronUp} from "../icons/chevron-up.svg";

export default class Header extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            dropDownActive: false,
        };
    }

    renderProfileLink(currentUser) {
        const {dropDownActive} = this.state;
        return (
            <div className="menu" onClick={() => this.setState({dropDownActive: !dropDownActive})}>
                <div className="user">
                    <span>{currentUser.name}</span>
                </div>
                <div className="drop-down">
                    {dropDownActive ? <ChevronUp/> : <ChevronDown/>}
                </div>
            </div>
        );
    }

    render() {
        const {currentUser} = this.props;
        const {dropDownActive} = this.state;
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""}`}>
                <div className="header">
                    <Link className="logo" to="/"><Logo/></Link>

                    <h1 className="title">{I18n.t("header.title")}</h1>
                    {!currentUser.guest && <div className="user-profile">
                        {this.renderProfileLink(currentUser)}
                        {dropDownActive &&
                        <UserMenu currentUser={currentUser} close={() => this.setState({dropDownActive: false})}/>}
                    </div>}
                </div>
            </div>
        );
    }
}
