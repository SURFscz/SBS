import React, {Component} from "react";
import "./App.scss";
import {library} from '@fortawesome/fontawesome-svg-core'
import {faLightbulb, faCoffee} from '@fortawesome/free-solid-svg-icons'
import Header from "../components/Header";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";

library.add(faLightbulb, faCoffee);

class App extends Component {
    render() {
        return (
            <Router>
                <div className="App">
                    <Header/>
                </div>
            </Router>
        );
    }
}

export default App;
