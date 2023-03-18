import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./EmailField.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import I18n from "i18n-js";
import {validEmailRegExp} from "../validations/regExps";

export default function EmailField({
                                       name,
                                       emails,
                                       addEmails,
                                       removeMail,
                                       isAdmin = false,
                                       pinnedEmails = [],
                                       error = false
                                   }) {

    const [emailErrors, setEmailErrors] = useState([]);
    const [value, setValue] = useState("");

    const internalOnChange = e => {
        if (!["Enter", "Spacebar", "Backspace", "Tab"].includes(e.key)) {
            setEmailErrors([]);
        }
        setValue(e.target.state);
    }

    const internalAddEmail = e => {
        if (isEmpty(e.key) && isEmpty(e.target.value)) {
            return;
        }
        const email = e.target.value;
        const invalidEmails = [];
        const delimiters = [",", " ", ";", "\n", "\t"];
        let emails;
        if (!isEmpty(email) && delimiters.some(delimiter => email.indexOf(delimiter) > -1)) {
            const replacedEmails = email.replace(/[;\s]/g, ",");
            const splitEmails = replacedEmails.split(",");
            emails = splitEmails
                .filter(part => {
                    const hasLength = part.trim().length > 0;
                    const valid = hasLength && validEmailRegExp.test(part);
                    if (!valid && hasLength) {
                        invalidEmails.push(part.trim());
                    }
                    return valid;
                });
        } else if (!isEmpty(email)) {
            const valid = validEmailRegExp.test(email.trim());
            if (valid) {
                emails = [email];
            } else {
                invalidEmails.push(email.trim());
            }
        }
        setEmailErrors((!isEmpty(e.target.value) && !isEmpty(invalidEmails)) ? invalidEmails : []);
        const uniqueEmails = [...new Set(emails)];
        if (!isEmpty(uniqueEmails)) {
            addEmails(uniqueEmails);
        }
        setValue("");
    };

    const internalRemoveMail = mail => e => {
        setEmailErrors([]);
        removeMail(mail)(e);
    }

    return (
        <div className={`email-field ${error ? "error" : ""}`}>
            <label htmlFor={name}>{name}
                <Tooltip
                    tip={`${I18n.t("invitation.inviteesMessagesTooltip")}${isAdmin ? I18n.t("invitation.appendAdminNote") : ""}`}/>
            </label>
            <div className={`inner-email-field ${error ? "error" : ""}`}>
                {emails.map(mail =>
                    <div key={mail} className="email-tag">
                        <span>{mail}</span>
                        {pinnedEmails.includes(mail) ?
                            <span className="disabled"><FontAwesomeIcon icon="envelope"/></span> :
                            <span onClick={internalRemoveMail(mail)}>
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
                {I18n.t("invitation.invalidEmails", {emails: emailErrors.join(", ")})}
            </p>}
        </div>
    );
}
