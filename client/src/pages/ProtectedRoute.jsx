import React from "react";
import {Redirect, Route} from "react-router-dom";

export function ProtectedRoute({currentUser, Component, redirectToLogin = false, ...res}) {
    if (!currentUser.guest) {
        return <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>
    } else if (redirectToLogin) {
        return <Redirect to={`/login?state=${encodeURIComponent(res.location.pathname)}`}/>;
    }
    return <Redirect to={"/404"}/>;
}

