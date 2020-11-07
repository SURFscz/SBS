import {NavLink, Route} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import I18n from "i18n-js";
import React from "react";
import {globalUserRole} from "../utils/UserRole";
import Button from "./Button";
import {emitter} from "../utils/Events";
import {setFlash} from "../utils/Flash";
import "./Impersonating.scss";
import {ReactComponent as HandIcon} from "../icons/toys-hand-ghost.svg";

export default function Impersonating({impersonator, currentUser, userReloading}) {

    const clearImpersonation = history => {
        emitter.emit("impersonation", null);
        setFlash(I18n.t("impersonate.flash.clearedImpersonation"));
        //TODO move to App
        userReloading && userReloading();
        setTimeout(() => history.push("/"), 1250);
    }

    return <div className="impersonator ">
        <NavLink to="/impersonate">
                            <span data-tip data-for="impersonator">
                                <HandIcon/></span>
            <ReactTooltip id="impersonator" type="light" effect="solid" data-html={true}
                          place="bottom">
                <p dangerouslySetInnerHTML={{
                    __html: I18n.t("impersonate.impersonatorTooltip", {
                        currentUser: currentUser.name,
                        impersonator: impersonator.name
                    })
                }}/>
            </ReactTooltip>
        </NavLink>
        <p dangerouslySetInnerHTML={{
            __html: I18n.t("impersonate.impersonator", {
                name: currentUser.name,
                role: globalUserRole(currentUser)
            })
        }}/>
        <Route render={({history}) => (
            <Button onClick={() => clearImpersonation(history)} txt={I18n.t("impersonate.exit")}/>
        )}/>
    </div>
}
