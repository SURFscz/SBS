import React from "react";
import PropTypes from "prop-types";

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import "./DateField.scss"
import moment from "moment";
import {stopEvent} from "../../utils/Utils";

export default class DateField extends React.Component {

    componentDidMount = () => {
        const {isOpen = false} = this.props;
        if (isOpen) {
            this.toggle();
        }
    }

    toggle = () => this.component.setOpen(true);

    invalidValue = (onChange) => {
        setTimeout(() => onChange(moment().add(16, "days").toDate()), 250);
    }

    validateOnBlur = e => {
        const {
            onChange, maxDate = null, minDate = null, allowNull = false, performValidateOnBlur = true,
            pastDatesAllowed = false
        } = this.props;
        if (!performValidateOnBlur) {
            stopEvent(e);
            return;
        }

        if (e && e.target) {
            const minimalDate = minDate || moment().add(1, "day").toDate();
            minimalDate.setHours(0,0,0,0);
            const value = e.target.value;
            if (value) {
                const m = moment(value, "DD/MM/YYYY");
                const d = m.toDate();
                if (!m.isValid() || (!pastDatesAllowed && d < minimalDate) || (maxDate && d > maxDate)) {
                    this.invalidValue(onChange);
                }
            } else if (!allowNull) {
                this.invalidValue(onChange);
            }
        }
    }

    render() {
        const {
            onChange, name, value, disabled = false, maxDate = null, minDate = null, toolTip = null, allowNull = false,
            showYearDropdown = false, pastDatesAllowed = false
        } = this.props;
        const minimalDate = minDate || moment().add(1, "day").endOf("day").toDate();
        const selectedDate = value || (allowNull ? null : moment().add(16, "days").toDate());
        return (
            <div className="date-field">
                {name && <label className="date-field-label" htmlFor={name}>{name}
                    {toolTip && <Tooltip tip={toolTip}/>}
                </label>}
                <label className={"date-picker-container"} htmlFor={name}>
                    <DatePicker
                        ref={ref => this.component = ref}
                        name={name}
                        id={name}
                        selected={selectedDate}
                        preventOpenOnFocus
                        dateFormat={"dd/MM/yyyy"}
                        onChange={onChange}
                        showWeekNumbers
                        isClearable={allowNull}
                        showYearDropdown={showYearDropdown}
                        onBlur={this.validateOnBlur}
                        weekLabel="Week"
                        disabled={disabled}
                        todayButton={null}
                        maxDate={maxDate}
                        minDate={pastDatesAllowed ? null : minimalDate}
                    />
                    <FontAwesomeIcon onClick={this.toggle} icon="calendar-alt"/>
                </label>
            </div>
        );
    }
}

DateField.propTypes = {
    name: PropTypes.string,
    value: PropTypes.object,
    onChange: PropTypes.func,
    performValidateOnBlur: PropTypes.bool,
    disabled: PropTypes.bool,
    isOpen: PropTypes.bool,
    maxDate: PropTypes.object,
    allowNull: PropTypes.bool,
    pastDatesAllowed: PropTypes.bool,
    showYearDropdown: PropTypes.bool,
    tooltip: PropTypes.string,
    className: PropTypes.string,
};
