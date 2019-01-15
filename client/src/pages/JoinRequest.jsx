import React from "react";
import "./JoinRequest.scss";
import {joinRequestById} from "../api";
import InputField from "../components/InputField";

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
            <div className="mod-join-request">
                <div className="join-request-container">
                        <InputField name="Motivation" value={"Nice"} disabled={true} />
                        <InputField name="WTF" placeholder={"somw placeholddr"} />
                        <InputField name="id" value={joinRequest.id} toolTip={"WTF Long Long"} />
                </div>
            </div>)
            ;
    };
}

export default JoinRequest;