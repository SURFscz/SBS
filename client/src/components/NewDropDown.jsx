import React from "react";
import I18n from "i18n-js";
import "./NewDropDown.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Link} from "react-router-dom";

export default class NewDropDown extends React.PureComponent {

    constructor(props, context) {
        super(props, context);

        this.state = {
            dropDownActive: false
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
                {allowedActions.map((action, i) => <li key={i}>
                    <Link to={action.path}>{I18n.t(`newDropDown.${action.name}`)}</Link>
                </li>)}
            </ul>
        );
    };

    render() {
        const {dropDownActive} = this.state;
        const {currentUser} = this.props;

        const allowedActions = [];

        const organisationMemberships = currentUser.organisation_memberships || [];
        const organisationAdmin = organisationMemberships.find(membership => membership.role === "admin");
        const allowedCollaborationRequest = !currentUser.admin && isEmpty(organisationMemberships);
        if (currentUser.admin) {
            allowedActions.push({
                name: "organisation",
                path: "/new-organisation"
            });
            allowedActions.push({
                name: "service",
                path: "/new-service"
            })
        }
        if (currentUser.admin || organisationAdmin) {
            allowedActions.push({
                name: "collaboration",
                path: "/new-collaboration"
            });
        }
        if (allowedCollaborationRequest) {
            allowedActions.push({
                name: "collaborationRequest",
                path: "/new-collaboration"
            });
        }
        return (
            <div className="new-drop-down" onClick={this.handleToggle}
                 onBlur={() => setTimeout(() => this.setState({dropDownActive: false}), 250)}
                 tabIndex="1">
                <FontAwesomeIcon icon="plus"/>
                {this.renderDropDownIndicator()}
                {dropDownActive && this.renderAllowedActions(allowedActions)}
            </div>)

    }
}
