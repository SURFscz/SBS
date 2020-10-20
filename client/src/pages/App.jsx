import React from "react";
import "./App.scss";
import I18n from "i18n-js";
import Header from "../components/Header";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import NotFound from "../pages/NotFound";
import ServerError from "../pages/ServerError";
import Navigation from "../components/Navigation";
import {config, me, other, refreshUser, reportError} from "../api";
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
import CollaborationGroups from "./CollaborationGroups";
import Group from "./Group";
import Invitation from "./Invitation";
import Impersonate from "./Impersonate";
import {emitter} from "../utils/Events";
import {isEmpty, pseudoGuid} from "../utils/Utils";
import Login from "./Login";
import {ProtectedRoute} from "./ProtectedRoute";
import NewApiKey from "./NewApiKey";
import Profile from "./Profile";
import Aup from "./Aup";
import CollaborationRequest from "./CollaborationRequest";
import ServiceConnectionRequest from "./ServiceConnectionRequest";
import OrganisationDetailLite from "./OrganisationDetailLite";
import ServiceRequest from "./ServiceRequest";
import Confirmation from "./Confirmation";
import {setFlash} from "../utils/Flash";
import System from "./System";
import OrganisationServices from "./OrganisationServices";

addIcons();

class App extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            currentUser: {},
            config: {},
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
            const guid = pseudoGuid();
            window.location.href = `${location.href}?guid=${guid}`;
        }
    };

    markUserAdmin = user => {
        const {config} = this.state;
        if (config.admin_users_upgrade && user.admin && !user.confirmed_super_user) {
            user.admin = false;
            user.needsSuperUserConfirmation = true;
        }
        return user;
    }

    componentDidMount() {
        emitter.addListener("impersonation", this.impersonate);
        const location = window.location;
        if (location.href.indexOf("error") > -1) {
            this.setState({loading: false});
        } else {
            config().then(res => {
                this.setState({config: res}, () => me(res).then(currentUser => {
                    if (currentUser && currentUser.uid) {
                        const user = this.markUserAdmin(currentUser);
                        this.setState({currentUser: user, loading: false});
                        if (currentUser.successfully_activated) {
                            setFlash(I18n.t("login.successfullyActivated"))
                        }
                    } else {
                        this.handleBackendDown();
                    }
                }).catch(e => {
                    if (e.response && e.response.status === 409) {
                        this.setState({
                            currentUser: {"uid": "anonymous", "guest": true, "admin": false},
                            loading: false
                        });
                        setFlash(I18n.t("login.suspended"), "error");
                    } else {
                        this.handleBackendDown();
                    }
                }));
            }).catch(() => this.handleBackendDown());
        }
    }

    componentWillUnmount() {
        emitter.removeListener("impersonation", this.impersonate);
    }

    impersonate = selectedUser => {
        if (isEmpty(selectedUser)) {
            me(this.state.config).then(currentUser => {
                this.setState({currentUser: this.markUserAdmin(currentUser), impersonator: null, loading: false});
            });
        } else {
            other(selectedUser.uid).then(user => {
                const {currentUser, impersonator} = this.state;
                const newUser = this.markUserAdmin(user);
                this.setState({currentUser: newUser, impersonator: impersonator || currentUser});
            });
        }
    };

    refreshUserMemberships = callback => {
        refreshUser().then(json => {
            const {impersonator} = this.state;
            this.setState({currentUser: json, impersonator: impersonator}, () => callback && callback());
        });
    };

    render() {
        const {
            loading, errorDialogAction, errorDialogOpen, currentUser, impersonator, config
        } = this.state;
        if (loading) {
            return null; // render null when app is not ready yet
        }
        return (
            <Router>
                <div className="app-container">
                    {currentUser && <div>
                        <Flash/>
                        <Header currentUser={currentUser} impersonator={impersonator} config={config}/>
                        <Navigation currentUser={currentUser} impersonator={impersonator}/>
                        <ErrorDialog isOpen={errorDialogOpen}
                                     close={errorDialogAction}/>
                    </div>}
                    <div className="page-container">
                        <Switch>
                            <Route exact path="/" render={() => {
                                return currentUser.guest ? <Redirect to="/landing"/> : <Redirect to="/home"/>;
                            }}/>

                            <Route exact path="/landing"
                                   render={props => {
                                       if (currentUser.guest) {
                                           return <Login user={currentUser} {...props}/>;
                                       }
                                       const state = getParameterByName("state", window.location.search);
                                       if (isEmpty(state)) {
                                           return <Redirect to="/home"/>;
                                       }
                                       return <Redirect to={decodeURIComponent(state)}/>
                                   }}/>

                            <Route exact path="/login"
                                   render={props => {
                                       if (currentUser.guest) {
                                           return <Login user={currentUser} {...props}/>;
                                       }
                                       const state = getParameterByName("state", window.location.search);
                                       if (isEmpty(state)) {
                                           return <Redirect to="/home"/>;
                                       }
                                       return <Redirect to={decodeURIComponent(state)}/>
                                   }}/>

                            <Route path="/registration"
                                   render={props => <Registration user={currentUser}
                                                                  collaboration={getParameterByName("collaboration", window.location.search)}
                                                                  {...props}/>}/>

                            <Route path="/home"
                                   render={props => {
                                       if (currentUser.guest) {
                                           return <Redirect to="/landing"/>;
                                       }
                                       return <ProtectedRoute
                                           currentUser={currentUser}
                                           Component={Home} {...props}/>
                                   }}/>

                            <Route exact path="/collaborations"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Collaborations} {...props}/>}/>

                            <Route exact path="/collaborations/:id"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={CollaborationDetail} {...props}/>}/>

                            <Route exact path="/organisations"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Organisations} {...props}/>}/>

                            <Route exact path="/organisations/:id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       refreshUser={this.refreshUserMemberships}
                                       Component={OrganisationDetail} {...props}/>}/>

                            <Route exact path="/organisations-lite/:id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={OrganisationDetailLite} {...props}/>}/>

                            <Route exact path="/services"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Services} {...props}/>}/>

                            <Route exact path="/services/:id"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    Component={Service} {...props}/>}/>

                            <Route exact path="/new-service"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    isNew={true}
                                                                    Component={Service} {...props}/>}/>

                            <Route exact path="/service-request"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={ServiceRequest} {...props}/>}/>

                            <Route exact path="/join-requests/:hash"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={JoinRequest} {...props}/>}/>

                            <Route path="/service-connection-requests/:hash"
                                   render={props => <ServiceConnectionRequest {...props}/>}/>

                            <Route path="/organisation-services/:organisation_id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={OrganisationServices} {...props}/>}/>

                            <Route exact path="/organisation-invitations/:id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={OrganisationInvitation} {...props}/>}/>

                            <Route exact path="/organisation-invitations/:action/:hash"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    redirectToLogin={true}
                                                                    Component={OrganisationInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/new-organisation-invite/:organisation_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={NewOrganisationInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/new-api-key/:organisation_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={NewApiKey}
                                                                    {...props}/>}/>

                            <Route exact path="/new-invite/:collaboration_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={NewInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/invitations/:id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={Invitation}
                                                                    {...props}/>}/>

                            <Route exact path="/invitations/:action/:hash"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    redirectToLogin={true}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={Invitation}
                                                                    {...props}/>}/>
                            <Route exact path="/collaboration-requests/:id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    redirectToLogin={true}
                                                                    Component={CollaborationRequest}
                                                                    {...props}/>}/>

                            <Route path="/new-organisation"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={NewOrganisation} {...props}/>}/>

                            <Route path="/new-collaboration"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={NewCollaboration}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    {...props}/>}/>

                            <Route path="/collaboration-services/:collaboration_id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={CollaborationServices} {...props}/>}/>

                            <Route path="/collaboration-groups/:collaboration_id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={CollaborationGroups} {...props}/>}/>

                            <Route path="/collaboration-group-details/:collaboration_id/:id"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Group} {...props}/>}/>

                            <Route path="/impersonate"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Impersonate}
                                       impersonator={impersonator} {...props}/>}/>

                            <Route path="/confirmation"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Confirmation}
                                       config={config} {...props}/>}/>

                            <Route path="/profile"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={Profile}
                                       refreshUser={this.refreshUserMemberships} {...props}/>}/>

                            <Route path="/system"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser} Component={System}/>}/>

                            <Route path="/aup" render={props =>
                                <Aup currentUser={currentUser} refreshUser={this.refreshUserMemberships} {...props}/>}/>

                            <Route path="/error" render={props => <ServerError {...props}/>}/>

                            <Route render={props => <NotFound currentUser={currentUser} {...props}/>}/>
                        </Switch>
                    </div>
                    <Footer/>
                </div>
            </Router>

        );
    }
}

export default App;
