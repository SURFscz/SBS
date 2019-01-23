import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import I18n from "i18n-js";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import "./DateField.scss"

export default function DateField({
                                      onChange, name, value, disabled = false, maxDate = null,
                                      toolTip = null, className = "date-field"
                                  }) {
    return (
        <div className="date-field">
            <label className="date-field-label" htmlFor={name}>{name} {toolTip &&
            <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="question-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
            </label>
            <label className={"date-picker-container"} htmlFor={name}>
                <DatePicker
                    name={name}
                    id={name}
                    selected={value}
                    preventOpenOnFocus
                    onChange={onChange}
                    showWeekNumbers
                    weekLabel="Week"
                    todayButton={I18n.t("forms.today")}
                    maxDate={null}
                />
                <FontAwesomeIcon icon="calendar-alt"/>
            </label>
        </div>
    );
}
