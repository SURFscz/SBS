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

    renderSpinner() {
        return this.state.loading ? <div className="spinner"><MDSpinner size={42} singleColor={"#4DB2CF"} duration={1000} borderSize={6}/> </div> : null;
    }

    render() {
        const {currentUser} = this.props;
        return (
            <div className="navigation-container">
                <div className="navigation">
                    {!currentUser.guest && this.renderItem("/my-collaborations", "my_collaborations")}
                    {this.renderItem("/registration", "registration")}
                </div>
                {this.renderSpinner()}
            </div>
        );
    }
}
