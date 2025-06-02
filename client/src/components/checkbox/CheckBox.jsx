import React from "react";
import PropTypes from "prop-types";
import {Checkbox as SDSCheckbox} from "@surfnet/sds";
import "./CheckBox.scss";

export default class CheckBox extends React.PureComponent {

    innerOnChange = e => {
        e.cancelBubble = true;
        e.stopPropagation();
        const {onChange} = this.props;
        onChange && onChange(e);
        return false;
    }

    render() {
        const {name, value, readOnly = false, info, tooltip, className = "checkbox", hide = false} = this.props;
        return <SDSCheckbox name={name}
                            value={value}
                            onChange={this.innerOnChange}
                            tooltip={tooltip}
                            className={className}
                            hide={hide}
                            readOnly={readOnly}
                            info={info}/>
    }
}
CheckBox.propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func,
    readOnly: PropTypes.bool,
    hide: PropTypes.bool,
    bold: PropTypes.bool,
    info: PropTypes.string,
    tooltip: PropTypes.string,
    className: PropTypes.string,
};
