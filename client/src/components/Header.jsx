import React from "react";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/SURF_SRAM.svg";
import "./Header.scss";
import UserMenu from "./redesign/UserMenu";
import {ReactComponent as ChevronDown} from "../icons/chevron-down.svg";
import {ReactComponent as ChevronUp} from "../icons/chevron-up.svg";
import {organisationByUserSchacHomeOrganisation} from "../api";
import {emitter} from "../utils/Events";

export default class Header extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            dropDownActive: false,
            organisation: null,
            orangeMode: true
        };
    }

    componentDidMount() {
        emitter.addListener("impersonation", this.impersonate);
        const {currentUser} = this.props;
        if (!currentUser.guest) {
            organisationByUserSchacHomeOrganisation()
                .then(res => this.setState({organisation: res}));
        }

    }

    componentWillUnmount() {
        emitter.removeListener("impersonation", this.impersonate);
    }

    toggleStyle = () => {
        this.setState({orangeMode: !this.state.orangeMode});
    }

    impersonate = () => {
        //Need to ensure the API call is done with the impersonated user
        setTimeout(() => organisationByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: res})), 750);
    }


    renderProfileLink = (currentUser, orangeMode) => {
        const {dropDownActive} = this.state;
        return (
            <div className="menu" onClick={() => this.setState({dropDownActive: !dropDownActive})}>
                <div className="user">
                    <span>{currentUser.name}</span>
                </div>
                <div className={`drop-down ${orangeMode ? "ugly" : ""}`}>
                    {dropDownActive ? <ChevronUp/> : <ChevronDown/>}
                </div>
            </div>
        );
    }

    render() {
        const {currentUser} = this.props;
        const {dropDownActive, organisation, orangeMode} = this.state;
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""} ${orangeMode ? "ugly" : ""}`}>
                <div className="header">
                    <Link className="logo" to="/" onClick={this.toggleStyle}><Logo/></Link>
                    {!currentUser.guest && <div className="user-profile">
                        {this.renderProfileLink(currentUser, orangeMode)}
                        {dropDownActive &&
                        <UserMenu currentUser={currentUser} organisation={organisation}
                                  close={() => this.setState({dropDownActive: false})}/>}
                    </div>}
                </div>
            </div>
        );
    }
}
