import React from "react";
import "./Home.scss";
import {stopEvent} from "../utils/Utils";
import {health} from "../api";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    componentWillMount = () => {
        health()
            .then(json => {});
    };
    render() {
        return (
            <div className="home">
                <div className="home-container">
                    <div>
                        <a href="/demo" onClick={e => {
                            stopEvent(e);
                            this.props.history.push("/registration?collaboration=AI%20computing");
                        }}>Demo</a>
                    </div>
                </div>
            </div>)
            ;
    };
}
export default Home;