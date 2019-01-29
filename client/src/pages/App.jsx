import React from "react";
import "./App.scss";
import Header from "../components/Header";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import NotFound from "../pages/NotFound";
import ServerError from "../pages/ServerError";
import Navigation from "../components/Navigation";
import {me, other, reportError} from "../api";
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
import Home from "./Home";
import JoinRequest from "./JoinRequest";
import NewOrganisation from "./NewOrganisation";
import {addIcons} from "../utils/IconLibrary";
import OrganisationInvitation from "./OrganisationInvitation";
import NewCollaboration from "./NewCollaboration";
import NewOrganisationInvitation from "./NewOrganisationInvitation";
import Service from "./Service";
import Services from "./Services";
import NewInvitation from "./NewInvitation";
import CollaborationServices from "./CollaborationServices";
import CollaborationAuthorisationGroups from "./CollaborationAuthorisationGroups";
import AuthorisationGroup from "./AuthorisationGroup";
import Invitation from "./Invitation";
import Impersonate from "./Impersonate";
import {emitter} from "../utils/Events";
import {isEmpty} from "../utils/Utils";

addIcons();

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

class App extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            currentUser: {},
            impersonator: null,
            error: false,
            errorDialogOpen: false,
            errorDialogAction: () => this.setState({errorDialogOpen: false})
        };
        window.onerror = (msg, url, line, col, err) => {
            if (err && err.response && err.response.status === 404) {
                this.props.history.push("/404");
                return;
            }
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

    componentWillMount() {
        emitter.addListener("impersonation", this.impersonate);
    }

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

    componentWillUnmount() {
        emitter.removeListener("impersonation", this.impersonate);
    }

    impersonate = selectedUser => {
        if (isEmpty(selectedUser)) {
            me().then(currentUser => {
                this.setState({currentUser: currentUser, impersonator: null, loading: false});
            });
        } else {
            other(selectedUser.uid).then(user => {
                const {currentUser} = this.state;
                this.setState({currentUser: user, impersonator: currentUser});
            });
        }
    };

    render() {
        const {
            loading, errorDialogAction, errorDialogOpen, currentUser, impersonator
        } = this.state;
        if (loading) {
            return null; // render null when app is not ready yet
        }
        return (
            <Router>
                <div className="app-container">
                    {currentUser && <div>
                        <Flash/>
                        <Header currentUser={currentUser} impersonator={impersonator}/>
                        <Navigation currentUser={currentUser} impersonator={impersonator} {...this.props}/>
                        <ErrorDialog isOpen={errorDialogOpen}
                                     close={errorDialogAction}/>
                    </div>}
                    <Switch>
                        <Route exact path="/" render={() => <Redirect to="/home"/>}/>
                        <Route exact path="/login" render={() =>
                            <Redirect
                                to={`/registration?collaboration=${getParameterByName("state", window.location.search)}`}/>}
                        />
                        <Route path="/registration"
                               render={props => <Registration user={currentUser}
                                                              collaboration={getParameterByName("collaboration", window.location.search)}
                                                              {...props}/>}
                        />
                        <Route path="/home"
                               render={props => <Home user={currentUser} {...props}/>}/>

                        <Route exact path="/collaborations"
                               render={props => <Collaborations user={currentUser} {...props}/>}/>

                        <Route exact path="/collaborations/:id"
                               render={props => <CollaborationDetail user={currentUser} {...props}/>}/>

                        <Route exact path="/organisations"
                               render={props => <Organisations user={currentUser} {...props}/>}/>

                        <Route exact path="/organisations/:id"
                               render={props => <OrganisationDetail user={currentUser} {...props}/>}/>

                        <Route exact path="/services"
                               render={props => <Services user={currentUser} {...props}/>}/>

                        <Route exact path="/services/:id"
                               render={props => <Service user={currentUser} {...props}/>}/>

                        <Route exact path="/join-requests/:id"
                               render={props => <JoinRequest user={currentUser} {...props}/>}/>

                        <Route exact path="/organisation-invitations/:id"
                               render={props => <OrganisationInvitation user={currentUser} {...props}/>}/>}

                        <Route exact path="/organisation-invitations/:action/:hash"
                               render={props => <OrganisationInvitation user={currentUser} {...props}/>}/>}

                        <Route exact path="/new-organisation-invite/:organisation_id"
                               render={props => <NewOrganisationInvitation user={currentUser} {...props}/>}/>}

                        <Route exact path="/new-invite/:collaboration_id"
                               render={props => <NewInvitation user={currentUser} {...props}/>}/>}

                        <Route exact path="/invitations/:id"
                               render={props => <Invitation user={currentUser} {...props}/>}/>}

                        <Route exact path="/invitations/:action/:hash"
                               render={props => <Invitation user={currentUser} {...props}/>}/>}

                        <Route path="/new-organisation"
                               render={props => <NewOrganisation user={currentUser} {...props}/>}/>

                        <Route path="/new-collaboration"
                               render={props => <NewCollaboration user={currentUser} {...props}/>}/>

                        <Route path="/collaboration-services/:collaboration_id"
                               render={props => <CollaborationServices user={currentUser} {...props}/>}/>

                        <Route path="/collaboration-authorisation-groups/:collaboration_id"
                               render={props => <CollaborationAuthorisationGroups user={currentUser} {...props}/>}/>

                        <Route path="/collaboration-authorisation-group-details/:collaboration_id/:id"
                               render={props => <AuthorisationGroup user={currentUser} {...props}/>}/>

                        <Route path="/error" render={props => <ServerError {...props}/>}/>

                        <Route path="/impersonate"
                               render={props => <Impersonate user={currentUser}  impersonator={impersonator} {...props}/>}/>

                        <Route component={NotFound}/>
                    </Switch>
                    <Footer/>
                </div>
            </Router>

        );
    }
}

export default App;
