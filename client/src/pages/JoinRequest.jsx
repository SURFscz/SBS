import React from "react";
import "./JoinRequest.scss";
import {joinRequestById} from "../api";

class JoinRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            joinRequest: {}
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            joinRequestById(params.id)
                .then(json => this.setState({joinRequest: json}))
                .catch(e => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    render() {
        const {joinRequest} = this.state;
        return (
            <div className="join-request">
                <div className="join-request-container">
                    <div>
                        {joinRequest.id}
                    </div>
                </div>
            </div>)
            ;
    };
}

export default JoinRequest;