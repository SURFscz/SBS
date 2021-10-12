import React from "react";
import "./App.scss";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import I18n from "i18n-js";
import Header from "../components/Header";
import NotFound from "../pages/NotFound";
import ServerError from "../pages/ServerError";
import {aupLinks, config, me, other, refreshUser, reportError} from "../api";
import "../locale/en";
import "../locale/nl";
import ErrorDialog from "../components/ErrorDialog";
import Welcome from "../components/redesign/Welcome";
import Footer from "../components/Footer";
import Flash from "../components/Flash";
import {getParameterByName} from "../utils/QueryParameters";
import CollaborationDetail from "./CollaborationDetail";
import OrganisationDetail from "./OrganisationDetail";
import Home from "./Home";
import OrganisationForm from "./OrganisationForm";
import {addIcons} from "../utils/IconLibrary";
import CollaborationForm from "./CollaborationForm";
import NewOrganisationInvitation from "./NewOrganisationInvitation";
import Service from "./Service";
import NewInvitation from "./NewInvitation";
import UserInvitation from "./UserInvitation";
import Impersonate from "./Impersonate";
import {emitter} from "../utils/Events";
import {isEmpty, pseudoGuid} from "../utils/Utils";
import Login from "./Login";
import {ProtectedRoute} from "./ProtectedRoute";
import Profile from "./Profile";
import CollaborationRequest from "./CollaborationRequest";
import ServiceConnectionRequest from "./ServiceConnectionRequest";
import ServiceRequest from "./ServiceRequest";
import Confirmation from "./Confirmation";
import {setFlash} from "../utils/Flash";
import System from "./System";
import {BreadCrumb} from "../components/BreadCrumb";
import Impersonating from "../components/Impersonating";
import History from "../components/History";
import ServiceDetail from "./ServiceDetail";
import SpinnerField from "../components/redesign/SpinnerField";
import DeadEnd from "./DeadEnd";
import SecondFactorAuthentication from "./SecondFactorAuthentication";
import ServiceDenied from "./ServiceDenied";
import UserDetail from "./UserDetail";

addIcons();

class App extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            currentUser: {},
            aupConfig: {},
            config: {},
            impersonator: null,
            reloading: false,
            error: false,
            errorDialogOpen: false,
            errorDialogAction: () => this.setState({errorDialogOpen: false})
        };
        window.onerror = (msg, url, line, col, err) => {
            if (err && err.response && err.response.status === 404) {
                window.location.href = "/404";
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

    aupConfirmed = (user, aupVersion) => {
        if (!user.guest && user.aups && user.aups.find(aup => aup.au_version === aupVersion)) {
            user.aupConfirmed = true;
        }
    }

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
                this.setState({config: res},
                    () => Promise.all([me(res), aupLinks()]).then(results => {
                        const currentUser = results[0];
                        if (currentUser && currentUser.uid) {
                            const user = this.markUserAdmin(currentUser);
                            this.aupConfirmed(user, results[1].version);
                            this.setState({currentUser: user, aupConfig: results[1], loading: false});
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

    impersonate = res => {
        const {user: selectedUser, callback} = res;
        if (isEmpty(selectedUser)) {
            me(this.state.config).then(currentUser => {
                this.setState({
                    currentUser: this.markUserAdmin(currentUser),
                    impersonator: null,
                    loading: false
                }, callback);
            });
        } else {
            other(selectedUser.uid).then(user => {
                const {currentUser, impersonator} = this.state;
                const newUser = this.markUserAdmin(user);
                this.setState({currentUser: newUser, impersonator: impersonator || currentUser}, callback);
            });
        }
    };

    refreshUserMemberships = callback => {
        refreshUser().then(json => {
            const {impersonator} = this.state;
            const user = this.markUserAdmin(json);
            this.setState({currentUser: user, impersonator: impersonator}, () => callback && callback());
        });
    };

    render() {
        const {
            loading, errorDialogAction, errorDialogOpen, currentUser, impersonator, config, reloading
        } = this.state;
        if (loading) {
            return null; // render null when app is not ready yet
        }
        return (
            <Router>
                <div className="app-container">
                    {currentUser && <div>
                        <Flash/>
                        <Header currentUser={currentUser} config={config}/>
                        {impersonator &&
                        <Impersonating impersonator={impersonator} currentUser={currentUser}/>}
                        {!currentUser.guest && <BreadCrumb/>}
                        <ErrorDialog isOpen={errorDialogOpen}
                                     close={errorDialogAction}/>
                    </div>}
                    {reloading && <SpinnerField/>}
                    {!reloading &&
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
                        <Route path="/2fa"
                               render={props => <SecondFactorAuthentication user={currentUser}
                                                                            refreshUser={this.refreshUserMemberships}
                                                                            {...props}/>}/>
                        <Route path="/2fa-update"
                               render={props => <SecondFactorAuthentication user={currentUser}
                                                                            refreshUser={this.refreshUserMemberships}
                                                                            update={true}
                                                                            {...props}/>}/>
                        <Route path="/registration"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                refreshUser={this.refreshUserMemberships}
                                                                collaborationIdentifier={getParameterByName("collaboration", window.location.search)}
                                                                Component={CollaborationDetail} {...props}/>}/>
                        <Route path="/home/:tab?"
                               render={props => {
                                   if (currentUser.guest) {
                                       return <Redirect to="/landing"/>;
                                   }
                                   return <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={Home} {...props}/>
                               }}/>

                        <Route exact path="/welcome"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={Welcome} {...props}/>}/>

                        <Route exact path="/collaborations/:id/:tab?"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                refreshUser={this.refreshUserMemberships}
                                                                Component={CollaborationDetail} {...props}/>}/>

                        <Route exact path="/organisations/:id/:tab?"
                               render={props => <ProtectedRoute
                                   currentUser={currentUser}
                                   refreshUser={this.refreshUserMemberships}
                                   config={config}
                                   Component={OrganisationDetail} {...props}/>}/>

                        <Route exact path="/audit-logs/:collection/:id"
                               render={props => <ProtectedRoute
                                   currentUser={currentUser} Component={History} {...props}/>}/>

                        <Route exact path="/services/:id/:tab?"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={ServiceDetail} {...props}/>}/>

                        <Route exact path="/edit-service/:id"
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

                        <Route path="/service-connection-requests/:hash"
                               render={props => <ServiceConnectionRequest {...props}/>}/>

                        <Route exact path="/organisation-invitations/:action/:hash"
                               render={props => <UserInvitation user={currentUser}
                                                                isOrganisationInvite={true}
                                                                refreshUser={this.refreshUserMemberships}
                                                                {...props}/>}/>

                        <Route exact path="/new-organisation-invite/:organisation_id"
                               render={props => <ProtectedRoute currentUser={currentUser}
                                                                Component={NewOrganisationInvitation}
                                                                {...props}/>}/>

                        <Route exact path="/new-invite/:collaboration_id"
                               render={props => <ProtectedRoute currentUser={currentUser}
                                                                Component={NewInvitation}
                                                                {...props}/>}/>

                        <Route exact path="/invitations/:action/:hash"
                               render={props => <UserInvitation user={currentUser}
                                                                isOrganisationInvite={false}
                                                                refreshUser={this.refreshUserMemberships}
                                                                {...props}/>}/>

                        <Route exact path="/collaboration-requests/:id"
                               render={props => <ProtectedRoute currentUser={currentUser}
                                                                redirectToLogin={true}
                                                                Component={CollaborationRequest}
                                                                {...props}/>}/>

                        <Route path="/new-organisation"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={OrganisationForm}
                                                                {...props}/>}/>

                        <Route path="/edit-organisation/:id"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={OrganisationForm}
                                                                {...props}/>}/>

                        <Route exact path="/edit-collaboration/:id"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={CollaborationForm}
                                                                refreshUser={this.refreshUserMemberships}
                                                                {...props}/>}/>

                        <Route path="/new-collaboration"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={CollaborationForm}
                                                                refreshUser={this.refreshUserMemberships}
                                                                {...props}/>}/>

                        {config.impersonation_allowed && <Route path="/impersonate"
                                                                render={props => <ProtectedRoute
                                                                    currentUser={currentUser} Component={Impersonate}
                                                                    impersonator={impersonator} {...props}/>}/>}

                        <Route path="/confirmation"
                               render={props => <ProtectedRoute
                                   currentUser={currentUser} Component={Confirmation}
                                   config={config} {...props}/>}/>

                        <Route path="/profile"
                               render={props => <ProtectedRoute
                                   currentUser={currentUser}
                                   Component={Profile}
                                   config={config}
                                   refreshUser={this.refreshUserMemberships} {...props}/>}/>

                        {currentUser.admin && <Route exact path="/users/:id/:tab?"
                               render={props => <ProtectedRoute config={config}
                                                                currentUser={currentUser}
                                                                Component={UserDetail} {...props}/>}/>}

                        <Route path="/system/:tab?"
                               render={props => <ProtectedRoute
                                   currentUser={currentUser}
                                   Component={System}
                                   config={config} {...props}/>}/>

                        <Route path="/dead-end"
                               render={props => <DeadEnd {...props}/>}/>

                        <Route path="/service-denied" render={props => <ServiceDenied {...props}/>}/>

                        <Route path="/error" render={props => <ServerError {...props}/>}/>

                        <Route render={props => <NotFound config={config} currentUser={currentUser} {...props}/>}/>
                    </Switch>}
                    <Footer/>
                </div>
            </Router>

        );
    }

}

export default App;
