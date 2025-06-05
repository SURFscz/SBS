import React from "react";
import "./Header.scss";
import {Logo, LogoColor, LogoType} from "@surfnet/sds";
import {UserMenu} from "../redesign/user-menu/UserMenu";
import {stopEvent} from "../../utils/Utils";
import FeedbackDialog from "../feedback/Feedback";
import {Link, withRouter} from "react-router-dom";

class Header extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showFeedBack: false
        };
    }

    render() {
        const {currentUser, config} = this.props;
        const {showFeedBack} = this.state;
        const showProfile = !currentUser.guest && currentUser.second_factor_confirmed;
        return (
            <div className="header-container">
                <FeedbackDialog isOpen={showFeedBack} close={() => this.setState({showFeedBack: false})}/>
                <div className="header-inner">
                    <Link className="logo" to={"/?redirect=false"}>
                        <Logo label={"Research Access Management"} position={LogoType.Bottom} color={LogoColor.White}/>
                    </Link>
                    {(showProfile && currentUser.user_accepted_aup) &&
                        <UserMenu currentUser={currentUser}
                                  config={config}
                                  provideFeedback={e => {
                                      stopEvent(e);
                                      this.setState({showFeedBack: true})
                                  }}
                        />
                    }
                </div>
            </div>
        );
    }
}

export default withRouter(Header);
