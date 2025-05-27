import {NavLink, Route} from "react-router-dom";
import {Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n";
import React from "react";
import {globalUserRole} from "../utils/UserRole";
import Button from "./button/Button";
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

  const role = globalUserRole(currentUser);
  return <div className="impersonator ">
    <NavLink to="/impersonate">
           <Tooltip children={<HandIcon/>} standalone={true} tip={I18n.t("impersonate.impersonatorTooltip", {
            currentUser: currentUser.name,
            impersonator: impersonator.name
          })} />
    </NavLink>
    <p dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(I18n.t("impersonate.impersonator", {
        name: currentUser.name,
        role: role
      }))
    }}/>
    <Route render={({history}) => (
      <Button small={true} onClick={() => clearImpersonation(history)} txt={I18n.t("impersonate.exit")}/>
    )}/>
  </div>
}
