import React, {Component} from "react";
import PropTypes from "prop-types";

import "./Tab.scss";

class Tab extends Component {
    static propTypes = {
        activeTab: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        icon: PropTypes.object,
        className: PropTypes.string,
        onClick: PropTypes.func.isRequired,
    };

    onClick = () => {
        const {name, onClick} = this.props;
        onClick(name);
    };

    render() {
        let {activeTab, className = "", label, name, icon} = this.props;

        className += " tab";

        if (activeTab === name) {
            className += " active";
        }

        return (
            <div className={className} onClick={this.onClick}>
                {icon && icon}<h2>{label}</h2>
            </div>
        );
    }
}

export default Tab;