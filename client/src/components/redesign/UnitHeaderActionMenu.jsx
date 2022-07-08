import React from "react";
import I18n from "i18n-js";

import "./UnitHeaderActionMenu.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Link} from "react-router-dom";
import {stopEvent} from "../../utils/Utils";
import PropTypes from "prop-types";

class UnitHeaderActionMenu extends React.Component {

    componentDidMount() {
        this.ref.focus();
    }

    performAction = action => e => {
        stopEvent(e);
        !action.disabled && action.perform();

    }

    render() {
        const {actions, history, auditLogPath, firstTime, queryParam} = this.props;
        return <div className="action-menu" ref={ref => this.ref = ref}
                    tabIndex={1}
                    onBlur={() => setTimeout(this.props.close, 250)}>
            <ul>
                {actions.map(action =>
                    <li key={action.name}
                        className={`${action.disabled ? "disabled" : ""} `}
                        onClick={this.performAction(action)}>
                        {action.icon && <FontAwesomeIcon icon={action.icon}/>}
                        {action.svg && <action.svg/>}
                        <a href={"/" + action.name}
                           className={`${action.disabled ? "disabled" : ""} `}>
                            {action.name}
                        </a>
                    </li>)}
                {(history && auditLogPath) &&
                <li onClick={() => this.props.history.push(`/audit-logs/${auditLogPath}?${queryParam}`)}>
                    <FontAwesomeIcon icon="history"/>
                    <Link to={`/audit-logs/${auditLogPath}?${queryParam}`}>
                        {I18n.t("home.history")}
                    </Link>
                </li>}
                {firstTime &&
                <li onClick={this.performAction({perform: firstTime})}>
                    <FontAwesomeIcon icon="plane-departure"/>
                    <a href={"/" + I18n.t("home.firstTime")}>
                        {I18n.t("home.firstTime")}
                    </a>
                </li>}

            </ul>
        </div>
    }
}

UnitHeaderActionMenu.propTypes = {
    actions: PropTypes.array,
    history: PropTypes.any,
    auditLogPath: PropTypes.string,
    firstTime: PropTypes.func,
    close: PropTypes.func,
    queryParam: PropTypes.string,
};

export default UnitHeaderActionMenu;
