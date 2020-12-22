import React, {Component} from "react";
import PropTypes from "prop-types";

import "./Tab.scss";

class Tab extends Component {
    static propTypes = {
        activeTab: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        readOnly: PropTypes.bool,
        icon: PropTypes.object,
        className: PropTypes.string,
        onClick: PropTypes.func.isRequired,
    };

    onClick = () => {
        const {name, onClick, readOnly} = this.props;
        if (!readOnly) {
            onClick(name);
        }

    };

    render() {
        let {activeTab, className = "", label, name, icon, notifier, readOnly} = this.props;

        className += ` tab ${name}`;

        if (activeTab === name) {
            className += " active";
        }
        if (readOnly) {
            className += " read-only";
        }

        return (
            <div className={className} onClick={this.onClick}>
                {notifier && <span className="notifier">{notifier}</span>}
                {icon && icon}<h2>{label}</h2>
            </div>
        );
    }
}

export default Tab;