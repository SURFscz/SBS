import React from "react";
import {Link} from "react-router-dom";
import {ReactComponent as Logo} from "../images/SURF_SRAM.svg";
import "./Header.scss";
import UserMenu from "./redesign/UserMenu";
import {ReactComponent as ChevronDown} from "../icons/chevron-down.svg";
import {ReactComponent as ChevronUp} from "../icons/chevron-up.svg";
import {organisationByUserSchacHomeOrganisation} from "../api";
import {emitter} from "../utils/Events";
import {stopEvent} from "../utils/Utils";
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

    toggleStyle = e => {
        stopEvent(e);
        if (e && e.shiftKey && e.metaKey) {
            this.setState({orangeMode: !this.state.orangeMode});
        }
    }

    impersonate = () => {
        //Need to ensure the API call is done with the impersonated user
        setTimeout(() => organisationByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: res})), 1500);
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
        return (
            <div className={`header-container ${currentUser.guest ? "guest" : ""} ${orangeMode ? "ugly" : ""}`}>

                <FeedbackDialog isOpen={showFeedBack} close={() => this.setState({showFeedBack: false})}/>

                <div className="header" onClick={this.toggleStyle}>
                    <Link className="logo" to="/"><Logo/></Link>
                    {!currentUser.guest &&
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
