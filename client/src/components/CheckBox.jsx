import React from "react";
import PropTypes from "prop-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import "./CheckBox.scss";
import ReactTooltip from "react-tooltip";

export default class CheckBox extends React.PureComponent {

    componentDidMount() {
        if (this.props.autofocus && this.input !== null) {
            this.input.focus();
        }
    }

    render() {
        const {name, value, readOnly = false, onChange = e => this, info, tooltip, className = "checkbox"} = this.props;
        return (
            <div className={className}>
                <input type="checkbox" id={name} name={name} checked={value}
                       onChange={onChange} disabled={readOnly}/>
                <label htmlFor={name}>
                    <span ref={ref => this.input = ref} tabIndex="0"><FontAwesomeIcon icon="check"/></span>
                </label>
                {info && <span>
                    <label htmlFor={name} className={`info ${readOnly ? "disabled" : ""}`}>{info}</label>
                    {tooltip && <span data-tip data-for={name}><FontAwesomeIcon icon="info-circle"/></span>}
                    {tooltip && <ReactTooltip id={name} type="info" effect="solid">
                        <p dangerouslySetInnerHTML={{__html: tooltip}}/>
                    </ReactTooltip>}
                </span>}
            </div>
        );
    }
}

CheckBox.propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func,
    readOnly: PropTypes.bool,
    info: PropTypes.string,
    tooltip: PropTypes.string,
    className: PropTypes.string,
    autofocus: PropTypes.bool
};


