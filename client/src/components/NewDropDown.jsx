import React from "react";
import I18n from "i18n-js";
import "./NewDropDown.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";

export default class NewDropDown extends React.PureComponent {

    constructor(props, context) {
        super(props, context);

        const {currentUser} = this.props;

        const allowedActions = [];

        const organisationMemberships = currentUser.organisation_memberships || [];
        const organisationAdmin = organisationMemberships.find(membership => membership.role === "admin");
        const allowedCollaborationRequest = !currentUser.admin && isEmpty(organisationMemberships);

        if (currentUser.admin) {
            allowedActions.push({
                title: I18n.t("newDropDown.organisation"),
                path: "/new-organisation"
            });
            allowedActions.push({
                title: I18n.t("newDropDown.service"),
                path: "/services/new"
            })
        }
        if (currentUser.admin || organisationAdmin) {
            allowedActions.push({
                title: I18n.t("newDropDown.collaboration"),
                path: "/new-collaboration"
            });
        }
        if (allowedCollaborationRequest) {
            allowedActions.push({
                title: I18n.t("newDropDown.collaborationRequest"),
                path: "/new-collaboration"
            });
        }

        this.state = {
            dropDownActive: false,
            allowedActions: allowedActions
        };

    }

    handleToggle = e => {
        stopEvent(e);
        this.setState({dropDownActive: !this.state.dropDownActive});
    };

    renderDropDownIndicator = () => this.state.dropDownActive ? <FontAwesomeIcon icon="caret-up"/> :
        <FontAwesomeIcon icon="caret-down"/>;

    renderAllowedActions = allowedActions => {
        return (
             <ul className="allowed-actions">

                </ul>
        );
    }

    render() {
        const {dropDownActive, allowedActions} = this.state;
        return (
            <div className="new-drop-down" onClick={this.handleToggle}>
                <FontAwesomeIcon icon="plus"/>
                {this.renderDropDownIndicator()}
                {dropDownActive && this.renderAllowedActions(allowedActions)}
            </div>)

    }
}
