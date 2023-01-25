import {NavLink, Route} from "react-router-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";
import I18n from "i18n-js";
import React from "react";
import {globalUserRole} from "../utils/UserRole";
import Button from "./Button";
import {emitter} from "../utils/Events";
import {setFlash} from "../utils/Flash";
import "./Impersonating.scss";
import {ReactComponent as HandIcon} from "../icons/puppet_new.svg";
import DOMPurify from "dompurify";

export default function Impersonating({impersonator, currentUser}) {

  const clearImpersonation = history => {
    emitter.emit("impersonation", {
      user: null, callback: () => {
        setFlash(I18n.t("impersonate.flash.clearedImpersonation"));
        history.push("/");
      }
    });
  }

  return <div className="impersonator ">
    <NavLink to="/impersonate">
                            <span data-tip data-for="impersonator">
                                <HandIcon/></span>
      <ReactTooltip id="impersonator" type="light" effect="solid" data-html={true}
                    place="bottom">
        <p dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(I18n.t("impersonate.impersonatorTooltip", {
            currentUser: currentUser.name,
            impersonator: impersonator.name
          }))
        }}/>
      </ReactTooltip>
    </NavLink>
    <p dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(I18n.t("impersonate.impersonator", {
        name: currentUser.name,
        role: globalUserRole(currentUser)
      }))
    }}/>
    <Route render={({history}) => (
      <Button onClick={() => clearImpersonation(history)} txt={I18n.t("impersonate.exit")}/>
    )}/>
  </div>
}
