import React from "react";
import {Redirect, Route} from "react-router-dom";
import {login} from "../utils/Login";
import {isEmpty} from "../utils/Utils";

const INTERRUPT_PATH_NAMES = ["/service-aup", "/interrupt", "/delay"]

export function ProtectedRoute({currentUser, Component, ...res}) {
    if (!currentUser.guest) {
        if (!currentUser.user_accepted_aup) {
            return <Redirect to="/aup"/>
        }
        if (!currentUser.second_factor_confirmed) {
            return <Redirect to="/2fa"/>;
        }
        //Ensure that we are not heading to a page which is initiated by the Interrupt page
        if (!isEmpty(currentUser.services_without_aup) && !INTERRUPT_PATH_NAMES.includes(window.location.pathname)) {
            return <Redirect to={`/missing-service-aup?state=${encodeURIComponent(res.location.pathname)}`}/>;
        }
        return <Route render={props => <Component user={currentUser} {...res} {...props}/>}/>;
    } else {
        setTimeout(login, 5);
        return null;
    }
}

