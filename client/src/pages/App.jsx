import React from "react";
import "./App.scss";
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import I18n from "../locale/I18n";
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
// eslint-disable-next-line no-unused-vars
import {csrfToken, setCsrfToken} from "../stores/AppStore";
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
import {clearFlash, setFlash} from "../utils/Flash";
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
import Aup from "./Aup";
import RefreshRoute from "./RefreshRoute";
import NewServiceInvitation from "./NewServiceInvitation";
import ServiceAdminInvitation from "./ServiceAdminInvitation";
import ServiceAup from "./ServiceAup";
import MissingServiceAup from "./MissingServiceAup";
import PamWebSSO from "./PamWebSSO";

import {getUserRequests, isUserAllowed, ROLES} from "../utils/UserRole";
import {SUBSCRIPTION_ID_COOKIE_NAME} from "../utils/SocketIO";
import MissingAttributes from "./MissingAttributes";
import CollaborationsOverview from "./CollaborationsOverview";
import MyRequests from "../components/redesign/MyRequests";
import Delay from "./Delay";
import Interrupt from "./Interrupt";

addIcons();

class App extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            currentUser: {guest: true},
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
            if (err && err.response && err.response.status === 403) {
                window.location.href = "/";
                return;
            }
            if (err && err.response && err.response.status === 422) {
                window.location.href = "/";
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

    componentDidMount() {
        const subscriptionId = pseudoGuid();
        sessionStorage.setItem(SUBSCRIPTION_ID_COOKIE_NAME, subscriptionId);
        emitter.addListener("impersonation", this.impersonate);
        Promise.all([config(), aupLinks()]).then(res => {
            this.setState({config: res[0], aupConfig: res[1]},
                () => me(res[0]).then(results => {
                    const currentUser = results;
                    if (currentUser && currentUser.uid) {
                        this.setState({currentUser: currentUser, loading: false});
                        // eslint-disable-next-line no-import-assign
                        setCsrfToken(results.CSRFToken);
                        if (currentUser.successfully_activated) {
                            setFlash(I18n.t("login.successfullyActivated"));
                            setTimeout(() => clearFlash(), 7500);
                        }
                    } else {
                        this.handleBackendDown();
                    }
                }).catch(e => {
                    if (e.response && e.response.status === 409) {
                        this.setState({
                            currentUser: {"uid": "anonymous", "guest": true, "admin": false, "suspended": true},
                            loading: false
                        });
                        setFlash(I18n.t("login.suspended"), "error");
                    } else {
                        this.handleBackendDown();
                    }
                }));
        }).catch(() => this.handleBackendDown());
        this.aprilFools();
    }

    aprilFools = () => {
        const date = new Date();
        if (date.getMonth() === 3 && date.getDate() === 1) {
            const styleTag = document.createElement("style");
            document.head.appendChild(styleTag);
            styleTag.sheet.insertRule("body, h1, h2, h3, h4, h5, ::-webkit-input-placeholder, .sds--branding--textual { font-family: 'Comic Sans', 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, Courier !important; }", 0);
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
                    currentUser: currentUser,
                    impersonator: null,
                    loading: false
                }, callback);
            });
        } else {
            other(selectedUser.uid).then(user => {
                const {currentUser, impersonator} = this.state;
                this.setState({
                    currentUser: user,
                    impersonator: impersonator || currentUser,
                    loading: false
                }, callback);
            });
        }
    };

    refreshUserMemberships = callback => {
        refreshUser().then(json => {
            const {impersonator} = this.state;
            this.setState({currentUser: json, impersonator: impersonator}, () => callback && callback(json));
            if (json.successfully_activated) {
                setFlash(I18n.t("login.successfullyActivated"));
                setTimeout(() => clearFlash(), 7500);
            }
        });
    };

    render() {
        const {
            loading, errorDialogAction, errorDialogOpen, currentUser, impersonator, config, reloading, aupConfig
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        return (
            <Router>
                <div className="app-container">
                    <div>
                        {currentUser && <Header currentUser={currentUser} config={config}/>}
                        <Flash/>
                        {impersonator &&
                            <Impersonating impersonator={impersonator} currentUser={currentUser}/>}
                        {!currentUser.guest && <BreadCrumb/>}
                        <ErrorDialog isOpen={errorDialogOpen}
                                     close={errorDialogAction}/>
                    </div>
                    {reloading && <SpinnerField/>}
                    {!reloading &&
                        <Switch>
                            <Route exact path="/" render={props => {
                                const rateLimited = getParameterByName("rate-limited", window.location.search)
                                if (rateLimited || currentUser.guest) {
                                    return <Login user={currentUser} {...props} rateLimited={rateLimited}/>;
                                }
                                const state = getParameterByName("state", window.location.search);
                                const redirect = getParameterByName("redirect", window.location.search);
                                if (isEmpty(state)) {
                                    return <Redirect to={`/home${redirect ? "?redirect=true" : ""}`}/>;
                                }
                                return <Redirect to={decodeURIComponent(state)}/>
                            }}/>

                            <Route exact path="/landing" render={() => {
                                return <Redirect to={`/${window.location.search}`}/>
                            }}/>

                            <Route exact path="/login"
                                   render={props => {
                                       if (currentUser.guest) {
                                           return <Login user={currentUser} {...props}/>;
                                       }
                                       const state = getParameterByName("state", window.location.search);
                                       if (isEmpty(state)) {
                                           return <Redirect to="/home?redirect=false"/>;
                                       }
                                       return <Redirect to={decodeURIComponent(state)}/>
                                   }}/>
                            <Route path="/2fa/:second_fa_uuid?"
                                   render={props => <SecondFactorAuthentication config={config}
                                                                                user={currentUser}
                                                                                refreshUser={this.refreshUserMemberships}
                                                                                {...props}/>}/>
                            <Route path="/2fa-update"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    user={currentUser}
                                                                    update={true}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={SecondFactorAuthentication} {...props}/>}/>
                            <Route path="/aup"
                                   render={props => <Aup config={config}
                                                         currentUser={currentUser}
                                                         refreshUser={this.refreshUserMemberships}
                                                         aupConfig={aupConfig}
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
                                           refreshUser={this.refreshUserMemberships}
                                           Component={Home}
                                           config={config} {...props}/>
                                   }}/>

                            <Route exact path="/welcome"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    Component={Welcome} {...props}/>}/>

                            <Route exact path="/collaborations/:id/:tab?/:groupId?"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={CollaborationDetail} {...props}/>}/>

                            <Route exact path="/collaborations-overview"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={CollaborationsOverview} {...props}/>}/>

                            <Route exact path="/my-requests"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    refreshUserHook={this.refreshUserMemberships}
                                                                    standAlone={true}
                                                                    requests={getUserRequests(currentUser)}
                                                                    Component={MyRequests} {...props}/>}/>

                            <Route exact path="/organisations/:id/:tab?"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       refreshUser={this.refreshUserMemberships}
                                       config={config}
                                       Component={OrganisationDetail} {...props}/>}/>

                            <Route exact path="/audit-logs/:collection/:id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    Component={History} {...props}/>}/>

                            <Route exact path="/services/:id/:tab?/:subTab?"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    refreshUser={this.refreshUserMemberships}
                                                                    Component={ServiceDetail} {...props}/>}/>

                            <Route exact path="/new-service"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    Component={Service} {...props}/>}/>

                            <Route exact path="/new-service-request"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    isServiceRequest={true}
                                                                    Component={Service} {...props}/>}/>

                            <Route exact path="/service-request/:service_request_id"
                                   render={props => <ProtectedRoute config={config}
                                                                    currentUser={currentUser}
                                                                    isServiceRequest={true}
                                                                    Component={Service} {...props}/>}/>

                            <Route exact path="/new-organisation-invite/:organisation_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    config={config}
                                                                    Component={NewOrganisationInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/new-invite/:collaboration_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    config={config}
                                                                    Component={NewInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/new-service-invite/:service_id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
                                                                    config={config}
                                                                    Component={NewServiceInvitation}
                                                                    {...props}/>}/>

                            <Route exact path="/invitations/:action/:hash"
                                   render={props => currentUser.guest ?
                                       <UserInvitation user={currentUser}
                                                       isOrganisationInvite={false}
                                                       refreshUser={this.refreshUserMemberships}
                                                       {...props}/>
                                       : <ProtectedRoute config={config}
                                                         currentUser={currentUser}
                                                         refreshUser={this.refreshUserMemberships}
                                                         Component={CollaborationDetail} {...props}/>
                                   }/>

                            <Route exact path="/organisation-invitations/:action/:hash"
                                   render={props => currentUser.guest ?
                                       <UserInvitation user={currentUser}
                                                       isOrganisationInvite={true}
                                                       refreshUser={this.refreshUserMemberships}
                                                       {...props}/>
                                       : <ProtectedRoute
                                           currentUser={currentUser}
                                           refreshUser={this.refreshUserMemberships}
                                           config={config}
                                           Component={OrganisationDetail} {...props}/>
                                   }/>

                            <Route exact path="/service-invitations/:action/:hash"
                                   render={props => currentUser.guest ?
                                       <ServiceAdminInvitation user={currentUser}
                                                               refreshUser={this.refreshUserMemberships}
                                                               {...props}/>
                                       : <ProtectedRoute
                                           currentUser={currentUser}
                                           refreshUser={this.refreshUserMemberships}
                                           config={config}
                                           invitation={true}
                                           Component={ServiceDetail} {...props}/>
                                   }/>

                            <Route exact path="/collaboration-requests/:id"
                                   render={props => <ProtectedRoute currentUser={currentUser}
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
                                                                        currentUser={currentUser}
                                                                        Component={Impersonate}
                                                                        impersonator={impersonator} {...props}/>}/>}

                            <Route path="/profile"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={Profile}
                                       config={config}
                                       refreshUser={this.refreshUserMemberships}
                                       {...props}/>}/>

                            {isUserAllowed(ROLES.ORG_MANAGER, currentUser) &&
                                <Route exact path="/users/:id/:tab?/:org_id?"
                                       render={props => <ProtectedRoute
                                           config={config}
                                           currentUser={currentUser}
                                           Component={UserDetail} {...props}/>}/>}

                            <Route path="/system/:tab?"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={System}
                                       config={config} {...props}/>}/>

                            <Route path="/dead-end"
                                   render={props => <DeadEnd {...props}/>}/>

                            <Route path="/refresh-route/:path"
                                   render={props => <RefreshRoute {...props}/>}/>

                            <Route path="/service-aup"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={ServiceAup}
                                       config={config}
                                       {...props}/>}/>

                            <Route path="/interrupt"
                                   render={props => <ProtectedRoute
                                       currentUser={currentUser}
                                       Component={Interrupt}
                                       config={config}
                                       {...props}/>}/>

                            <Route path="/delay"
                                   render={props => <Delay
                                       {...props}/>}/>

                            <Route path="/missing-service-aup"
                                   render={props => <MissingServiceAup
                                       user={currentUser}
                                       reloadMe={this.refreshUserMemberships}
                                       {...props}/>}/>

                            <Route path="/weblogin/:service/:session_id"
                                   render={props => <PamWebSSO user={currentUser} {...props}/>}/>

                            <Route path="/service-denied" render={props => <ServiceDenied {...props}/>}/>

                            <Route path="/error" render={props => <ServerError {...props}/>}/>

                            <Route path="/missing-attributes"
                                   render={props => <MissingAttributes config={config}
                                                                       currentUser={currentUser} {...props}/>}/>

                            <Route render={props => <NotFound config={config} currentUser={currentUser} {...props}/>}/>
                        </Switch>}
                    <Footer/>
                </div>
            </Router>

        );
    }

}

export default App;
