import React from "react";
import I18n from "i18n-js";

import MDSpinner from "react-md-spinner";
import spinner from "../utils/Spin.js";

import {NavLink} from "react-router-dom";

import "./Navigation.scss";
import NewDropDown from "./NewDropDown";
import {isEmpty} from "../utils/Utils";

export default class Navigation extends React.PureComponent {

    constructor() {
        super();
        this.state = {
            loading: false,
        };
    }

    componentDidMount() {
        spinner.onStart = () => this.setState({loading: true});
        spinner.onStop = () => this.setState({loading: false});
    }

    renderItem = (href, value) => <NavLink activeClassName="active" className="menu-item title-header"
                                           to={href}>{I18n.t("navigation." + value)}</NavLink>;

    renderSpinner = () =>
        this.state.loading ? <div className="spinner">
            <MDSpinner size={42}
                       singleColor={"#FFD700"}
                       duration={1000}
                       borderSize={8}/>
        </div> : null;

    render() {
        const {currentUser, impersonator} = this.props;
        const memberships = currentUser.organisation_memberships || [];
        const isOrganisationAdmin = memberships.some(membership => membership.role === "admin");
        const mayImpersonate = currentUser.admin || (impersonator && impersonator.admin);
        const mayCreateSomething = currentUser.admin || isOrganisationAdmin || (isEmpty(memberships) && !currentUser.guest);
        const needsToAgreeWithAup = currentUser.needs_to_agree_with_aup;
        if (needsToAgreeWithAup) {
            return (
                <div className="navigation-container">
                    <div className="navigation">
                        {this.renderItem("/aup", "aup")}
                    </div>
                    {this.renderSpinner()}
                </div>
            );
        }
        return (
            <div className="navigation-container">
                <div className="navigation">
                    {!currentUser.guest && this.renderItem("/home", "home")}
                    {window.location.pathname.indexOf("registration") > -1 &&
                    this.renderItem("/registration", "registration")}
                    {!currentUser.guest && this.renderItem("/profile", "profile")}
                    <div className="menu-item-right">
                        {currentUser.needsSuperUserConfirmation && this.renderItem("/confirmation", "confirmation")}
                        {mayImpersonate && this.renderItem("/impersonate", "impersonate")}
                        {mayCreateSomething && <NewDropDown currentUser={currentUser}/>}
                    </div>
                </div>
                {this.renderSpinner()}
            </div>
        );
    }
}
