import I18n from "i18n-js";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {logout} from "../../utils/Login";

const adminLinks = ["system", "impersonate"]

class UserMenu extends React.Component {

    componentDidMount() {
        this.ref.focus();
    }

    render() {
        const {currentUser} = this.props;
        return (
            <div className="user-menu" ref={ref => this.ref = ref} tabIndex={1} onBlur={() => setTimeout(this.props.close, 250)}>
                <ul>
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={this.props.close} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    <li>
                        <Link onClick={this.props.close} to={`/profile`}>{I18n.t(`header.links.profile`)}</Link>
                    </li>
                    <li>
                        <a href="/logout" onClick={logout}>{I18n.t(`header.links.logout`)}</a>
                    </li>
                </ul>
            </div>
        );
    }
}

export default UserMenu;