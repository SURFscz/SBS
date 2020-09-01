import React from "react";
import {Redirect, Route} from "react-router-dom";
import {login} from "../utils/Login";

export function ProtectedRoute({currentUser, Component, redirectToLogin = true, ...res}) {
    if (!currentUser.guest) {

        return currentUser.needs_to_agree_with_aup ?
            <Redirect to={`/aup?state=${encodeURIComponent(res.location.pathname)}`}/> :
            <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>;

    } else if (redirectToLogin) {
        setTimeout(login, 5);
        return null;
    }
    return <Redirect to={`/404?state=${encodeURIComponent(res.location.pathname)}`}/>;
}

