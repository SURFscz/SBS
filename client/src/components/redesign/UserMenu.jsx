import I18n from "i18n-js";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {logout} from "../../utils/Login";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {isEmpty} from "../../utils/Utils";

const adminLinks = ["system", "impersonate"]

class UserMenu extends React.Component {

    componentDidMount() {
        this.ref.focus();
    }

    render() {
        const {currentUser, organisation, config, provideFeedback} = this.props;
        const lessThenOrgManager = !isUserAllowed(ROLES.ORG_MANAGER, currentUser);
        const collMenuItemRequired = lessThenOrgManager && !isEmpty(organisation) && organisation.has_members
        const collCreateAllowed = !isEmpty(organisation)
            && (organisation.collaboration_creation_allowed_entitlement || organisation.collaboration_creation_allowed);
        return (
            <div className="user-menu" ref={ref => this.ref = ref} tabIndex={1}
                 onBlur={() => setTimeout(this.props.close, 250)}>
                <ul>
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={this.props.close} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    {collMenuItemRequired && <li>
                        <Link onClick={this.props.close} to={`/new-collaboration`}>
                            {I18n.t(`header.links.${collCreateAllowed ? "createCollaboration" : "requestCollaboration"}`)}
                        </Link>
                    </li>}
                    <li>
                        <Link onClick={this.props.close} to={`/profile`}>{I18n.t(`header.links.profile`)}</Link>
                    </li>
                    {config.feedback_enabled && <li>
                        <a href="/feedback" onClick={provideFeedback} >{I18n.t(`header.links.feedback`)}</a>
                    </li>}
                    <li>
                        <a href="/logout" onClick={logout}>{I18n.t(`header.links.logout`)}</a>
                    </li>
                </ul>
            </div>
        );
    }
}

export default UserMenu;