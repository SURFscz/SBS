import React from "react";
import PropTypes from "prop-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import "./CheckBox.scss";
import {Tooltip} from "@surfnet/sds";
import DOMPurify from "dompurify";

export default class CheckBox extends React.PureComponent {

    componentDidMount() {
        if (this.props.autofocus && this.input !== null) {
            this.input.focus();
        }
    }

    innerOnChange = e => {
        e.cancelBubble = true;
        e.stopPropagation();
        const {onChange} = this.props;
        onChange && onChange(e);
        return false;
    }

    render() {
        const {name, value, readOnly = false, info, tooltip, className = "checkbox", hide= false} = this.props;
        return (
            <div className={`${className} ${hide ? "hide" : ""}`}>
                <input type="checkbox" id={name} name={name} checked={value}
                       onChange={this.innerOnChange} disabled={readOnly}/>
                <label htmlFor={name}>
                    <span ref={ref => this.input = ref} tabIndex="0"><FontAwesomeIcon icon="check"/></span>
                </label>
                {info && <span>
                    <label htmlFor={name} className={`info ${readOnly ? "disabled" : ""}`}
                           dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>
                    {tooltip && <Tooltip tip={tooltip} />}
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
    hide: PropTypes.bool,
    info: PropTypes.string,
    tooltip: PropTypes.string,
    className: PropTypes.string,
    autofocus: PropTypes.bool
};


