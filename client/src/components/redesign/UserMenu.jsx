import I18n from "i18n-js";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {logout} from "../../utils/Login";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import {isEmpty} from "../../utils/Utils";
import {clearFlash} from "../../utils/Flash";
import {UserInfo} from "@surfnet/sds";


class UserMenu extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            dropDownActive: false
        };
    }

    toggleUserMenu = () => {
        this.setState({dropDownActive: !this.state.dropDownActive})
        clearFlash();
    }

    renderMenu = (currentUser, adminLinks, collCreateAllowed, provideFeedback, collMenuItemRequired, config) => {
        return (<>
                <ul>
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={this.toggleUserMenu} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    {collMenuItemRequired && <li>
                        <Link onClick={this.toggleUserMenu} to={`/new-collaboration`}>
                            {I18n.t(`header.links.${collCreateAllowed ? "createCollaboration" : "requestCollaboration"}`)}
                        </Link>
                    </li>}
                    <li>
                        <Link onClick={this.toggleUserMenu} to={`/profile`}>{I18n.t(`header.links.profile`)}</Link>
                    </li>
                    {config.feedback_enabled && <li>
                        <a href="/feedback" onClick={provideFeedback}>{I18n.t(`header.links.feedback`)}</a>
                    </li>}
                </ul>
                <ul>
                    <li>
                        <a href="/logout" onClick={logout}>{I18n.t(`header.links.logout`)}</a>
                    </li>
                </ul>
            </>
        )
            ;

    }

    render() {
        const {currentUser, organisation, config, provideFeedback} = this.props;
        const {dropDownActive} = this.state;
        const adminLinks = ["system"];
        if (config.impersonation_allowed) {
            adminLinks.push("impersonate")
        }
        const lessThenOrgManager = !isUserAllowed(ROLES.ORG_MANAGER, currentUser);
        const collMenuItemRequired = lessThenOrgManager && !isEmpty(organisation) && organisation.has_members
        const collCreateAllowed = !isEmpty(organisation)
            && (organisation.collaboration_creation_allowed_entitlement || organisation.collaboration_creation_allowed);
        return (
            <div className="user-menu"
                 ref={ref => this.ref = ref}
                 tabIndex={1}
                 onBlur={() => setTimeout(() => this.setState({dropDownActive: !dropDownActive}), 250)}>
                <UserInfo isOpen={dropDownActive}
                          children={this.renderMenu(currentUser, adminLinks, collCreateAllowed, provideFeedback, collMenuItemRequired, config)}
                          organisationName={organisation || "-"}
                          userName={currentUser.name}
                          toggle={() => this.setState({dropDownActive: !dropDownActive})}
                />
            </div>
        );
    }
}

export default UserMenu;