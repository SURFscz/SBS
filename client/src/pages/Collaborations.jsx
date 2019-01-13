import React from "react";
import {collaborations} from "../api";
import "./Collaborations.scss";


class Collaborations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaborations: []
        }
    }

    componentWillMount = () => {
            collaborations()
                .then(json => this.setState({collaborations: json}));
    };

    render() {
        const {collaborations} = this.state;
        return <div className="collaborations">
            { JSON.stringify(collaborations, null, 2)}
        </div>
    }
}

export default Collaborations;