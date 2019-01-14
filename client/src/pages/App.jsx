import React from "react";
import "./App.scss";
import {library} from '@fortawesome/fontawesome-svg-core'
import {
    faLightbulb,
    faGavel,
    faLink,
    faBook,
    faInfoCircle,
    faCircle,
    faPlus,
    faCheck,
    faCheckCircle,
    faWindowClose,
    faSearch,
    faArrowRight,
    faExternalLinkAlt,
    faArrowUp,
    faArrowDown,
} from '@fortawesome/free-solid-svg-icons'
import Header from "../components/Header";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import NotFound from "../pages/NotFound";
import ServerError from "../pages/ServerError";
import Navigation from "../components/Navigation";
import {me, reportError} from "../api";
import "../locale/en";
import "../locale/nl";
import ErrorDialog from "../components/ErrorDialog";
import Registration from "./Registration";
import Collaborations from "./Collaborations";
import Footer from "../components/Footer";
import Flash from "../components/Flash";
import {getParameterByName} from "../utils/QueryParameters";
import CollaborationDetail from "./CollaborationDetail";
import Organisations from "./Organisations";
import OrganisationDetail from "./OrganisationDetail";


library.add(faLightbulb, faGavel, faLink, faBook, faCheckCircle, faInfoCircle, faCircle, faCheck,
    faPlus, faSearch, faWindowClose, faArrowRight, faExternalLinkAlt, faArrowUp, faArrowDown);

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

class App extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            currentUser: {},
            error: false,
            errorDialogOpen: false,
            errorDialogAction: () => this.setState({errorDialogOpen: false})
        };
        window.onerror = (msg, url, line, col, err) => {
            this.setState({errorDialogOpen: true});
            const info = err || {};
            const response = info.response || {};
            const error = {
                userAgent: navigator.userAgent,
                message: msg,
                url: url,
                line: line,
                col: col,
                error: info.message,
                stack: info.stack,
                targetUrl: response.url,
                status: response.status
            };
            reportError(error);
        };
    }

    handleBackendDown = () => {
        const location = window.location;
        const alreadyRetried = location.href.indexOf("guid") > -1;
        if (alreadyRetried) {
            window.location.href = `${location.protocol}//${location.hostname}${location.port ? ":" + location.port : ""}/error`;
        } else {
            //302 redirects from Shib are cached by the browser. We force a one-time reload
            const guid = (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
            window.location.href = `${location.href}?guid=${guid}`;
        }
    };

    componentDidMount() {
        const location = window.location;
        if (location.href.indexOf("error") > -1) {
            this.setState({loading: false});
        } else {
            me().then(currentUser => {
                if (currentUser && currentUser.uid) {
                    this.setState({currentUser: currentUser, loading: false});
                } else {
                    this.handleBackendDown();
                }
            }).catch(() => this.handleBackendDown());
        }
    }


    render() {
        const {
            loading, errorDialogAction, errorDialogOpen, currentUser
        } = this.state;
        if (loading) {
            return null; // render null when app is not ready yet
        }
        return (
            <Router>
                <div className="app-container">
                    {currentUser && <div>
                        <Flash/>
                        <Header currentUser={currentUser}/>
                        <Navigation currentUser={currentUser} {...this.props}/>
                        <ErrorDialog isOpen={errorDialogOpen}
                                     close={errorDialogAction}/>
                    </div>}
                    <Switch>
                        <Route exact path="/" render={() => <Redirect to="/home"/>}/>
                        <Route path="/login" render={() =>
                            <Redirect
                                to={`/registration?collaboration=${getParameterByName("state", window.location.search)}`}/>}
                        />
                        <Route path="/registration"
                               render={props => <Registration user={currentUser}
                                                              service={getParameterByName("service", window.location.search)}
                                                              collaboration={getParameterByName("collaboration", window.location.search)}
                                                              {...props}/>}
                        />
                        <Route path="/home"
                               render={props => <Collaborations user={currentUser} {...props}/>}/>
                        <Route exact path="/collaborations"
                               render={props => <Collaborations user={currentUser} {...props}/>}/>
                        <Route exact path="/collaborations/:id"
                               render={props => <CollaborationDetail user={currentUser} {...props}/>}/>
                        {currentUser.admin &&
                        <Route exact path="/organisations"
                               render={props => <Organisations user={currentUser} {...props}/>}/>}
                        {currentUser.admin &&
                        <Route exact path="/organisations/:id"
                               render={props => <OrganisationDetail user={currentUser} {...props}/>}/>}
                        <Route path="/error" render={props => <ServerError {...props}/>}/>
                        <Route component={NotFound}/>
                    </Switch>
                    <Footer/>
                </div>
            </Router>

        );
    }
}

export default App;
