import React, {useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./OrganisationUnits.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";

export const OrganisationUnits = ({units, setUnits, readOnly}) => {

    const [duplicate, setDuplicate] = useState(-1);

    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current && inputRef.current.focus();
    });

    const internalOnChange = index => e => {
        const name = e.target.value;
        if (units.filter(unit => unit.name.toLowerCase() === name.toLowerCase()).length > 1) {
            setDuplicate(index);
            return stopEvent(e);
        } else {
            setDuplicate(-1);
            const unit = units[index];
            unit.name = name;
            units.splice(index, 1, unit);
            setUnits([...units]);
        }
    }

    const removeUnit = index => {
        units.splice(index, 1);
        setUnits(...units);
    }

    const addUnit = e => {
        stopEvent(e);
        setUnits(...units.concat({name: ""}));
    }

 const       renderConfirmation = (service, disallowedOrganisation) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(disallowedOrganisation, service);
        const collAffectedUnique = removeDuplicates(collAffected, "id");
        return (
            <div className="allowed-organisations-confirmation">
                <p>{I18n.t("models.serviceOrganisations.disableAccessConsequences")}</p>
                <ul>
                    {collAffectedUnique.map(coll => <li key={coll.id}>{coll.name}
                        <span>{` - ${I18n.t("models.serviceOrganisations.collaboration")}`}</span>
                    </li>)
                    }
                    {orgAffected.map(org => <li key={org.id}>{org.name}
                        <span>{`- ${I18n.t("models.serviceOrganisations.organisation")}`}</span>
                    </li>)
                    }
                </ul>
            </div>
        );
    }

    return (
        <div className="organisation-units">
            <label htmlFor={name}>{name}
                <Tooltip
                    tip={`${I18n.t("invitation.inviteesMessagesTooltip")}${isAdmin ? I18n.t("invitation.appendAdminNote") : ""}`}/>
            </label>
            <div className={`inner-email-field ${error ? "error" : ""}`}>
                {emails.map((mail, index) =>
                    <div key={index} className="email-tag">
                        {displayEmail(mail)}
                        {pinnedEmails.includes(mail) ?
                            <span className="disabled icon"><FontAwesomeIcon icon="envelope"/></span> :
                            <span className="icon" onClick={internalRemoveMail(mail)}>
                                <FontAwesomeIcon icon="times"/>
                            </span>}

                    </div>)}
                <textarea id="email-field"
                          value={value}
                          onChange={internalOnChange}
                          onBlur={internalAddEmail}
                          onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                                  internalAddEmail(e);
                                  setTimeout(() => document.getElementById("email-field").focus(), 50);
                                  return stopEvent(e);
                              } else if (e.key === "Backspace" && isEmpty(value) && emails.length > 0) {
                                  const mail = emails[emails.length - 1];
                                  if (!pinnedEmails.includes(mail)) {
                                      internalRemoveMail(mail)();
                                  }
                              }
                          }}
                          placeholder={emails.length === 0 ? I18n.t("invitation.inviteesPlaceholder") : ""} cols={3}/>
            </div>
            {(!isEmpty(emailErrors) && value === "") && <p className="error">
                {I18n.t("invitation.invalidEmails", {emails: Array.from(new Set(emailErrors)).join(", ")})}
            </p>}
        </div>
    );
}
