import React from "react";
import "./Header.scss";
import {Logo, LogoColor, LogoType} from "@surfnet/sds";
import {UserMenu} from "./redesign/UserMenu";
import {organisationsByUserSchacHomeOrganisation} from "../api";
import {emitter} from "../utils/Events";
import {getSchacHomeOrg, stopEvent} from "../utils/Utils";
import FeedbackDialog from "./Feedback";
import {Link} from "react-router-dom";

export default class Header extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: null,
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
            const classList = document.body.classList;
            const classValue = classList.value;
            const styles = ["green", "blue", "red", "orange", "purple"].map(s => `sds--color-palette--${s}`);
            const index = styles.indexOf(classValue);
            const newClassValue = styles[index === (styles.length - 1) ? 0 : index + 1]
            classList.replace(classValue, newClassValue);
            alert("New color palette is:" + newClassValue);
        }
    }

    impersonate = () => {
        //Need to ensure the API call is done with the impersonated user
        setTimeout(() => organisationsByUserSchacHomeOrganisation()
            .then(res => this.setState({organisation: getSchacHomeOrg(this.props.currentUser, res)})), 1750);
    }


    render() {
        const {currentUser, config} = this.props;
        const {organisation, showFeedBack} = this.state;
        const showProfile = !currentUser.guest && currentUser.second_factor_confirmed;
        return (
            <div className="header-container">
                <FeedbackDialog isOpen={showFeedBack} close={() => this.setState({showFeedBack: false})}/>
                <div className="header-inner" onClick={this.toggleStyle}>
                    <Link className="logo" to={"/"}>
                        <Logo label={"Research Access Management"} position={LogoType.Bottom} color={LogoColor.White}/>
                    </Link>
                    {(showProfile && currentUser.user_accepted_aup) &&
                    <UserMenu currentUser={currentUser}
                              organisation={organisation}
                              config={config}
                              provideFeedback={e => {
                                  stopEvent(e);
                                  this.setState({showFeedBack: true})
                              }}/>
                    }
                </div>
            </div>
        );
    }
}
