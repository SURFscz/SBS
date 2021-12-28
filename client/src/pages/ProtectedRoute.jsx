import React from "react";
import {Redirect, Route} from "react-router-dom";
import {login} from "../utils/Login";
import {isEmpty} from "../utils/Utils";

export function ProtectedRoute({currentUser, Component, redirectToLogin = true, ...res}) {
    if (!currentUser.guest) {
        if (!currentUser.user_accepted_aup) {
            return <Redirect to="/aup"/>
        }
        if (!currentUser.second_factor_confirmed) {
            return <Redirect to="/2fa"/>;
        }
        if (!isEmpty(currentUser.services_without_aup) && window.location.href.indexOf("service-aup?service_id") === -1) {
            return <Redirect to="/missing-service-aup"/>;
        }
        return <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>;
    } else if (redirectToLogin) {
        setTimeout(login, 5);
        return null;
    }
    return <Redirect to={`/404?state=${encodeURIComponent(res.location.pathname)}`}/>;
}

