import React from "react";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/SURF_SRAM.svg";
import "./Header.scss";
import UserMenu from "./redesign/UserMenu";
import {ReactComponent as ChevronDown} from "../icons/chevron-down.svg";
import {ReactComponent as ChevronUp} from "../icons/chevron-up.svg";
import {organisationsByUserSchacHomeOrganisation} from "../api";
import {emitter} from "../utils/Events";
import {getSchacHomeOrg, stopEvent} from "../utils/Utils";
import FeedbackDialog from "./Feedback";

export default class Header extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            dropDownActive: false,
            organisation: null,
            orangeMode: true,
            showFeedBack: false
        };
    }

    UNSAFE_componentWillReceiveProps = nextProps => {
        if (nextProps.currentUser.user_accepted_aup) {
            organisationsByUserSchacHomeOrganisation()
                .then(res => this.setState({organisation: getSchacHomeOrg(nextProps.currentUser, res)}));
        }
    };

    componentDidMount() {
        emitter.addListener("impersonation", this.impersonate);
        const {currentUser} = this.props;
        if (!currentUser.guest && currentUser.second_factor_confirmed && currentUser.user_accepted_aup) {
            organisationsByUserSchacHomeOrganisation()
                .then(res => this.setState({organisation: getSchacHomeOrg(currentUser, res)}));
        }

    }

    componentWillUnmount() {
        emitter.removeListener("impersonation", this.impersonate);
    }

    toggleStyle = e => {
        stopEvent(e);
        if (e && e.shiftKey && e.metaKey) {
            this.setState({orangeMode: !this.state.orangeMode});
        }
    }

    impersonate = () => {
        //Need to ensure the API call is done with the impersonated user
        setTimeout(() => organisationsByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: getSchacHomeOrg(this.props.currentUser, res)})), 1750);
    }


    renderProfileLink = (currentUser, orangeMode) => {
        const {dropDownActive} = this.state;
        return (
            <div className="menu">
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
        const {currentUser, config} = this.props;
        const {dropDownActive, organisation, orangeMode, showFeedBack} = this.state;
        const showProfile = !currentUser.guest && currentUser.second_factor_confirmed;
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""} ${orangeMode ? "ugly" : ""}`}>

                <FeedbackDialog isOpen={showFeedBack} close={() => this.setState({showFeedBack: false})}/>

                <div className="header-inner" onClick={this.toggleStyle}>
                    <Link className="logo" to="/"><Logo/></Link>
                    {(showProfile && currentUser.user_accepted_aup) &&
                    <div className="user-profile" onClick={() => this.setState({dropDownActive: !dropDownActive})}>
                        {this.renderProfileLink(currentUser, orangeMode)}
                        {dropDownActive &&
                        <UserMenu currentUser={currentUser}
                                  organisation={organisation}
                                  config={config}
                                  close={() => this.setState({dropDownActive: false})}
                                  provideFeedback={e => {
                                      stopEvent(e);
                                      this.setState({showFeedBack: true})
                                  }}/>}
                    </div>}
                </div>
            </div>
        );
    }
}
