import React, {Component} from "react";
import PropTypes from "prop-types";
import {ReactComponent as AlertIcon} from "../../icons/alert-circle.svg";
import "./Tab.scss";
import {BadgeNumber} from "@surfnet/sds";

class Tab extends Component {
    static propTypes = {
        activeTab: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        readOnly: PropTypes.bool,
        icon: PropTypes.object,
        className: PropTypes.string,
        onClick: PropTypes.func.isRequired,
        busy: PropTypes.bool
    };

    onClick = () => {
        const {name, onClick, readOnly} = this.props;
        if (!readOnly) {
            onClick(name);
        }

    };

    render() {
        let {activeTab, className = "", label, name, icon, notifier, readOnly, busy} = this.props;

        className += ` tab ${name}`;

        if (activeTab === name) {
            className += " active";
        }
        if (readOnly) {
            className += " read-only";
        }
        if (busy) {
            className += " busy";
        }
        let chipCount = null;
        if (label && label.indexOf("(") > -1) {
            const count = label.substring(label.indexOf("(") + 1, label.indexOf(")"));
            label = label.substring(0, label.indexOf("(") - 1);
            chipCount = <BadgeNumber value={count} small={true}/>
        }
        return (
            <div className={className} onClick={this.onClick}>
                {notifier && <span className="notifier"><AlertIcon/></span>}
                <button className={"tab-label"}>{icon && icon}{label}{chipCount}</button>
            </div>
        );
    }
}

export default Tab;
