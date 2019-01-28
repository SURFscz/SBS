import React from "react";
import "./Home.scss";
import {health} from "../api";
import I18n from "i18n-js";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    componentWillMount = () => {
        health()
            .then(json => {
            });
    };

    render() {
        const {user} = this.props;
        return (
            <div className="mod-home">
                <div className="title">
                    <p>{I18n.t("home.title", {name: user.name})}</p>
                </div>
                <div className="home">

                </div>
            </div>)
            ;
    };
}

export default Home;