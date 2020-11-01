import I18n from "i18n-js";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";

const links = ["profile", "logout"];
const adminLinks = ["system", "impersonate"]

//https://stackoverflow.com/questions/32553158/detect-click-outside-react-component<Tabs
class UserMenu extends React.Component {

    handleClick = e => {
        if (!this.node.contains(e.target)) {
            return setTimeout(this.props.close, 250);
        }
        return true;
    }

    componentDidMount() {
        document.addEventListener("mousedown", this.handleClick);
    }

    componentWillUnmount() {
        document.removeEventListener("mousedown", this.handleClick);
    }

    render() {
        const {currentUser} = this.props;
        return (
            <div className="user-menu" ref={node => this.node = node}>
                <ul>
                    {links.map(l => <li key={l}>
                        <Link onClick={this.props.close} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                    {currentUser.admin && adminLinks.map(l => <li key={l}>
                        <Link onClick={this.props.close} to={`/${l}`}>{I18n.t(`header.links.${l}`)}</Link>
                    </li>)}
                </ul>
            </div>
        );
    }
}

export default UserMenu;