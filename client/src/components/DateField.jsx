import React from "react";
import PropTypes from "prop-types";

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import "./DateField.scss"
import moment from "moment";

export default class DateField extends React.PureComponent {

    toggle = () => this.component.setOpen(true);

    validateOnBlur = e => {
        if (e && e.target) {
            const {onChange, maxDate = null, minDate = null} = this.props;
            const minimalDate = minDate || moment().add(1, "day").toDate();
            const maximalDate = maxDate || moment().add(31, "day").toDate();
            const value = e.target.value;
            if (value) {
                const m = moment(value, "dd/MM/yyyy");
                const d = m.toDate();
                if (!m.isValid() || d > maximalDate || d < minimalDate) {
                    onChange(moment().add(16, "days").toDate());
                }
            } else {
                onChange(moment().add(16, "days").toDate());
            }
        }
    }

    render() {
        const {
            onChange, name, value, disabled = false, maxDate = null, minDate = null, toolTip = null
        } = this.props;
        const minimalDate = minDate || moment().add(1, "day").endOf("day").toDate();
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
                        dateFormat={"dd/MM/yyyy"}
                        onChange={onChange}
                        showWeekNumbers
                        onBlur={this.validateOnBlur}
                        weekLabel="Week"
                        disabled={disabled}
                        todayButton={null}
                        maxDate={maxDate}
                        minDate={minimalDate}
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
