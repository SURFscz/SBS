import React from "react";
import {collaborationById} from "../api";
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
            {collaborations.length}
        </div>
    }
}

export default Collaborations;