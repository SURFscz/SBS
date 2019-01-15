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

    componentWillMount() {
        spinner.onStart = () => this.setState({loading: true});
        spinner.onStop = () => this.setState({loading: false});
    }

    renderItem(href, value) {
        return (
            <NavLink activeClassName="active" className="menu-item" to={href}>{I18n.t("navigation." + value)}</NavLink>
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
        const {currentUser} = this.props;
        return (
            <div className="navigation-container">
                <div className="navigation">
                    {this.renderItem("/home", "home")}
                    {this.renderItem("/registration", "registration")}
                    {!currentUser.guest && this.renderItem("/collaborations", "collaborations")}
                    {currentUser.admin && this.renderItem("/organisations", "organisations")}
                </div>
                {this.renderSpinner()}
            </div>
        );
    }
}
