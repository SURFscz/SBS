import React from "react";
import {health} from "../api";

class Collaborations extends React.Component {

    componentDidMount() {
        health();
    };

    render() {
        return <div className="collaborations">
            Collaborations
        </div>
    }
}
export default Collaborations;