import React, {useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./EmailField.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import {validEmailRegExp} from "../../validations/regExps";

export default function EmailField({
                                       name,
                                       emails,
                                       addEmails,
                                       removeMail,
                                       isAdmin = false,
                                       pinnedEmails = [],
                                       error = false,
                                       autoFocus = false,
                                       required = false
                                   }) {

    const [emailErrors, setEmailErrors] = useState([]);
    const [value, setValue] = useState("");

    const inputRef = useRef(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const internalOnChange = e => {
        if (!["Enter", "Spacebar", "Backspace", "Tab"].includes(e.key)) {
            setEmailErrors([]);
        }
        setValue(e.target.value);
    }

    const displayEmail = email => {
        const indexOf = email.indexOf("<");
        if (indexOf > -1) {
            return <Tooltip tip={email.substring(indexOf + 1, email.length - 1)}
                            standalone={true}
                            children={<span>{email.substring(0, indexOf).trim()}</span>}/>;
        }
        return <span>{email}</span>;
    }

    const validateEmail = (part, invalidEmails) => {
        const hasLength = part.trim().length > 0;
        const valid = hasLength && validEmailRegExp.test(part);
        if (!valid && hasLength) {
            invalidEmails.push(part.trim());
        }
        return valid;
    }

    const internalAddEmail = e => {
        if (isEmpty(e.key) && isEmpty(e.target.value)) {
            return;
        }
        const email = e.target.value;
        const invalidEmails = [];
        const delimiters = [",", " ", ";", "\n", "\t"];
        let emails;
        if (!isEmpty(email) && email.indexOf("<") > -1) {
            emails = email.split(/[,\n\t;]/)
                .map(e => e.trim())
                .filter(part => {
                    const indexOf = part.indexOf("<");
                    part = indexOf > -1 ? part.substring(indexOf + 1, part.length - 1) : part;
                    return validateEmail(part, invalidEmails);
                });
        } else if (!isEmpty(email) && delimiters.some(delimiter => email.indexOf(delimiter) > -1)) {
            const replacedEmails = email.replace(/[;\s]/g, ",");
            const splitEmails = replacedEmails.split(",");
            emails = splitEmails
                .filter(part => validateEmail(part, invalidEmails));
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
            <label htmlFor={name}>{name}{required && <sup className="required">*</sup>}
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
                          ref={inputRef}
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
