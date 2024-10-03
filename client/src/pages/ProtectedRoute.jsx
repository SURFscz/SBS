import React from "react";
import {Redirect, Route} from "react-router-dom";
import {login} from "../utils/Login";
import {isEmpty} from "../utils/Utils";

export function ProtectedRoute({currentUser, Component, ...res}) {
    if (!currentUser.guest) {
        if (!currentUser.user_accepted_aup) {
            return <Redirect to="/aup"/>
        }
        if (!currentUser.second_factor_confirmed) {
            return <Redirect to="/2fa"/>;
        }
        //Ensure that we are not heading to service-aup which is initiated by eduTeams
        if (!isEmpty(currentUser.services_without_aup) && window.location.href.indexOf("service-aup") === -1) {
            return <Redirect to={`/missing-service-aup?state=${encodeURIComponent(res.location.pathname)}`}/>;
        }
        return <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>;
    } else {
        setTimeout(login, 5);
        return null;
    }
    return <Redirect to={`/404?state=${encodeURIComponent(res.location.pathname)}`}/>;
}

