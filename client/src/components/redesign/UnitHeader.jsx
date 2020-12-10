import React from "react";
import I18n from "i18n-js";
import "./UnitHeader.scss";
import "./UnitHeaderActionMenu.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Logo from "./Logo";
import {ReactComponent as ChevronUp} from "../../icons/chevron-up.svg";
import {ReactComponent as ChevronDown} from "../../icons/chevron-down.svg";
import {Link} from "react-router-dom";
import {isEmpty} from "../../utils/Utils";
import PropTypes from "prop-types";

class UnitHeader extends React.Component {

    constructor() {
        super();
        this.state = {
            showDropDown: false
        };
    }

    renderDropDownLink = (showDropDown, dropDownTitle) => {
        return (
            <div className="unit-menu" onClick={() => this.setState({showDropDown: !showDropDown})}>
                <span>{dropDownTitle}</span>
                {showDropDown ? <ChevronUp/> : <ChevronDown/>}
            </div>
        );
    }

    renderDropDownMenu = (actions, history, auditLogPath, firstTime, queryParam) => {
        return <div className="action-menu" tabIndex={1} onBlur={() => this.setState({showDropDown: false})}>
            <ul>
                {actions.map(action => <li>
                    <FontAwesomeIcon icon={action.icon}/>
                    <Link onClick={action.perform}>{action.name}</Link>
                </li>)}
                {(history && auditLogPath) &&
                <li>
                    <FontAwesomeIcon icon="history"/>
                    <Link onClick={() => history.push(`/audit-logs/${auditLogPath}?${queryParam}`)}>
                        {I18n.t("home.history")}
                    </Link>
                </li>}
                {firstTime &&
                <li onClick={firstTime}>
                    <FontAwesomeIcon icon="plane-departure"/>
                    <Link onClick={firstTime}>
                        {I18n.t("home.firstTime")}
                    </Link>
                </li>}

            </ul>
        </div>
    }


    render() {
        const {
            obj, history, auditLogPath, name, breadcrumbName, svgClick, firstTime, actions, dropDownTitle, children
        } = this.props;
        const {showDropDown} = this.state;
        const queryParam = `name=${encodeURIComponent(breadcrumbName || name)}&back=${encodeURIComponent(window.location.pathname)}`;
        return (
            <div className="unit-header-container">
                <div className="unit-header">
                    <div className="image">
                        {obj.logo && <Logo src={obj.logo}/>}
                        {obj.svg && <obj.svg onClick={() => svgClick && svgClick()}/>}
                        {obj.icon && <FontAwesomeIcon icon={obj.icon}/>}
                    </div>
                    <div className="obj-name">
                        {obj.name && <h1>{obj.name}</h1>}
                        {obj.organisation && <span className="name">{obj.organisation.name}</span>}
                        <div className="children">
                            {children}
                        </div>
                    </div>
                    {!isEmpty(actions) &&
                    <div className="action-menu-container">
                        {this.renderDropDownLink(showDropDown, dropDownTitle)}
                        {(true || showDropDown) && this.renderDropDownMenu(actions, history, auditLogPath, firstTime, queryParam)}
                    </div>}
                </div>
            </div>
        )
    }

}

UnitHeader.propTypes = {
    obj: PropTypes.object,
    history: PropTypes.object,
    auditLogPath: PropTypes.string,
    dropDownTitle: PropTypes.string,
    name: PropTypes.string,
    breadcrumbName: PropTypes.string,
    svgClick: PropTypes.func,
    firstTime: PropTypes.func,
    actions: PropTypes.array,
};

export default UnitHeader;
