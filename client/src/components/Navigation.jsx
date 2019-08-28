import React from "react";
import I18n from "i18n-js";

import MDSpinner from "react-md-spinner";
import spinner from "../utils/Spin.js";

import {NavLink} from "react-router-dom";

import "./Navigation.scss";

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

    renderItem(href, value, className = "menu-item") {
        return (
            <NavLink activeClassName="active" className={className} to={href}>{I18n.t("navigation." + value)}</NavLink>
        );
    }

    renderSpinner = () =>
        this.state.loading ? <div className="spinner">
            <MDSpinner size={42}
                       singleColor={"#FFD700"}
                       duration={1000}
                       borderSize={8}/>
        </div> : null;

    render() {
        const {currentUser, impersonator} = this.props;
        const isCollaborationAdmin = (currentUser.collaboration_memberships || []).some(membership => membership.role === "admin");
        const isOrganisationAdmin = (currentUser.organisation_memberships || []).some(membership => membership.role === "admin");
        const mayImpersonate = currentUser.admin || (impersonator && impersonator.admin);
        return (
            <div className="navigation-container">
                <div className="navigation">
                    {!currentUser.guest && this.renderItem("/home", "home")}
                    {window.location.pathname.indexOf("registration") > -1 && this.renderItem("/registration", "registration")}
                    {(currentUser.admin || isCollaborationAdmin || isOrganisationAdmin) && this.renderItem("/collaborations", "collaborations")}
                    {currentUser.admin && this.renderItem("/organisations", "organisations")}
                    {currentUser.admin && this.renderItem("/services", "services")}
                    {this.renderItem("/profile", "profile")}
                    {mayImpersonate && this.renderItem("/impersonate", "impersonate", "menu-item right")}
                </div>
                {this.renderSpinner()}
            </div>
        );
    }
}
