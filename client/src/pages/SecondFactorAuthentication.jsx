import React from "react";
import {withRouter} from "react-router-dom";
import "./SecondFactorAuthentication.scss";


class SecondFactorAuthentication extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {aup: {}, agreed: false};
    }

    componentDidMount() {
        //TODO
    }

    render() {
        const {aup, agreed} = this.state;
        const {user} = this.props;
        debugger;
        return (
            <div className="mod-aup">
                <span>TODO</span>
                <span>{JSON.stringify(user)}</span>
            </div>
        )
    }
}

export default withRouter(SecondFactorAuthentication);