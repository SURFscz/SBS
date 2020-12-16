import React from "react";
import I18n from "i18n-js";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/surf.svg";
import "./Header.scss";
import UserMenu from "./redesign/UserMenu";
import {ReactComponent as ChevronDown} from "../icons/chevron-down.svg";
import {ReactComponent as ChevronUp} from "../icons/chevron-up.svg";
import {organisationByUserSchacHomeOrganisation} from "../api";
import {emitter} from "../utils/Events";

export default class Header extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            dropDownActive: false,
            organisation: null
        };
    }

    componentDidMount() {
        emitter.addListener("impersonation", this.impersonate);
        organisationByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: res}));
    }

    componentWillUnmount() {
        emitter.removeListener("impersonation", this.impersonate);
    }

    impersonate = () => {
        //Need to ensure the API call is done with the impersonated user
        setTimeout(() => organisationByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: res})), 750);
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
        const {dropDownActive, organisation} = this.state;
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""}`}>
                <div className="header">
                    <Link className="logo" to="/"><Logo/></Link>

                    <h1 className="title">{I18n.t("header.title")}</h1>
                    {!currentUser.guest && <div className="user-profile">
                        {this.renderProfileLink(currentUser)}
                        {dropDownActive &&
                        <UserMenu currentUser={currentUser} organisation={organisation}
                                  close={() => this.setState({dropDownActive: false})}/>}
                    </div>}
                </div>
            </div>
        );
    }
}
