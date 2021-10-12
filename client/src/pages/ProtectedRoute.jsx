import React from "react";
import {Redirect, Route} from "react-router-dom";
import {login} from "../utils/Login";

export function ProtectedRoute({currentUser, Component, redirectToLogin = true, ...res}) {
    if (!currentUser.guest) {
        if (!currentUser.aupConfirmed) {
            return <Redirect to="/aup"/>
        }
        if (currentUser.second_factor_confirmed) {
            return <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>;
        }
        return <Redirect to="/2fa"/>
    } else if (redirectToLogin) {
        setTimeout(login, 5);
        return null;
    }
    return <Redirect to={`/404?state=${encodeURIComponent(res.location.pathname)}`}/>;
}

