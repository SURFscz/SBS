import React from "react";
import {health} from "../api";

class Registration extends React.Component {

    componentDidMount = () => {
        health();
    };

    render() {
        return <div className="registration">
            TODO
        </div>
    }
}
export default Registration;