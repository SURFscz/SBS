import React from "react";
import PropTypes from "prop-types";

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import I18n from "i18n-js";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import "./DateField.scss"
import moment from "moment";

export default class DateField extends React.PureComponent {

    toggle = () => this.component.setOpen(true);

    render() {
        const {
            onChange, name, value, disabled = false, maxDate = null, minDate = null, toolTip = null
        } = this.props;
        return (<div className="date-field">
                <label className="date-field-label" htmlFor={name}>{name} {toolTip &&
                <span className="tool-tip-section">
                <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>
                <ReactTooltip id={name} type="light" effect="solid" data-html={true}>
                    <p dangerouslySetInnerHTML={{__html: toolTip}}/>
                </ReactTooltip>
            </span>}
                </label>
                <label className={"date-picker-container"} htmlFor={name}>
                    <DatePicker
                        ref={ref => this.component = ref}
                        name={name}
                        id={name}
                        selected={value}
                        preventOpenOnFocus
                        onChange={onChange}
                        showWeekNumbers
                        weekLabel="Week"
                        disabled={disabled}
                        todayButton={I18n.t("forms.today")}
                        maxDate={maxDate}
                        minDate={minDate || moment().add(1, "day").toDate()}
                    />
                    <FontAwesomeIcon onClick={this.toggle} icon="calendar-alt"/>
                </label>
            </div>
        );
    }
}

DateField.propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    maxDate: PropTypes.object,
    tooltip: PropTypes.string,
    className: PropTypes.string,
};
