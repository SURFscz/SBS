import React from "react";
import "./UnitHeader.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Logo from "./Logo";
import {isEmpty, splitListSemantically, stopEvent} from "../../utils/Utils";
import PropTypes from "prop-types";
import Button from "../button/Button";
import {ButtonType, Chip, MenuButton} from "@surfnet/sds";
import {Link} from "react-router-dom";
import I18n from "../../locale/I18n";
import {MoreLessText} from "../MoreLessText";

class UnitHeader extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDropDown: false
        };
    }

    performAction = action => e => {
        stopEvent(e);
        !action.disabled && action.perform();
    }

    otherOptions = (chevronActions, firstTime, auditLogPath, history, queryParam) => {
        return (
            <ul className={"other-options"}>
                {chevronActions.map((action, index) => <li key={index} onClick={this.performAction(action)}>
                    <a href={`/${action.name}`}>{action.name}</a>
                </li>)}
                {(history && auditLogPath) &&
                    <li onClick={() => this.props.history.push(`/audit-logs/${auditLogPath}?${queryParam}`)}>
                        <Link to={`/audit-logs/${auditLogPath}?${queryParam}`}>
                            {I18n.t("home.history")}
                        </Link>
                    </li>}
                {firstTime &&
                    <li onClick={this.performAction({perform: firstTime})}>
                        <a href={"/" + I18n.t("home.firstTime")}>
                            {I18n.t("home.firstTime")}
                        </a>
                    </li>}
            </ul>
        )
    }

    render() {
        const {
            obj, history, auditLogPath, name, breadcrumbName, svgClick, firstTime, actions, children, customAction,
            displayDescription, labels, displayShortName, subName
        } = this.props;
        const {showDropDown} = this.state;
        const queryParam = `name=${encodeURIComponent(breadcrumbName || name)}&back=${encodeURIComponent(window.location.pathname)}`;
        const nonChevronActions = (actions || []).filter(action => action.buttonType !== ButtonType.Chevron);
        const chevronActions = (actions || []).filter(action => action.buttonType === ButtonType.Chevron);
        const showChevronAction = (history && auditLogPath) || firstTime || chevronActions.length > 0;
        return (
            <div className="unit-header-container">
                <div className="unit-header">
                    <div className={`image ${obj.style || ""}`}>
                        {obj.logo && <Logo src={obj.logo}/>}
                        {obj.svg && <obj.svg onClick={() => svgClick && svgClick()}/>}
                        {obj.icon && <FontAwesomeIcon icon={obj.icon}/>}
                    </div>
                    <div className="obj-name">
                        <div className="meta-info-container">
                            <div className="meta-info">
                                {obj.name && <h1>{obj.name}</h1>}
                                {subName && <h6>{subName}</h6>}
                                {obj.organisation &&
                                    <span className="name">
                                        {`${obj.organisation.name}${isEmpty(obj.units) ? "" : " – " + splitListSemantically(obj.units.map(unit => unit.name), I18n.t("service.compliancySeparator"))}`}
                                    </span>}
                                {!isEmpty(labels) &&
                                    <div className="labels">
                                        {labels.sort().map((label, index) => <span key={index}
                                                                                   className="chip-container">
                                        <Chip label={label}/></span>)}
                                    </div>}
                            </div>

                        </div>
                        {(obj.short_name && displayShortName) &&
                            <p className="short-name">{I18n.t("collaboration.shortName")}<span>{obj.short_name}</span>
                            </p>
                        }
                        {(obj.description && displayDescription) &&
                            <MoreLessText txt={obj.description}/>
                        }
                        {children}
                    </div>
                    <div className="action-menu-container">
                        {nonChevronActions.map((action, index) =>
                            <Button key={index}
                                    onClick={() => !action.disabled && action.perform()}
                                    txt={action.name}
                                    warningButton={action.buttonType === ButtonType.DestructiveSecondary}
                                    cancelButton={action.buttonType === ButtonType.Secondary && action.buttonType !== ButtonType.DestructiveSecondary}/>)
                        }
                        {showChevronAction &&
                            <div tabIndex={1}
                                 className={isEmpty(actions) ? "options" : "otherOptions"}
                                 onBlur={() => setTimeout(() => this.setState({showDropDown: false}), 250)}>
                                <MenuButton txt={I18n.t(`home.${isEmpty(actions) ? "options" : "otherOptions"}`)}
                                            isOpen={showDropDown}
                                            toggle={() => this.setState({showDropDown: !showDropDown})}
                                            buttonType={ButtonType.Secondary}
                                            children={this.otherOptions(chevronActions, firstTime, auditLogPath, history, queryParam)}/>
                            </div>}
                    </div>
                    {customAction && customAction}
                </div>
            </div>
        )
    }

}

UnitHeader.propTypes = {
    obj: PropTypes.object,
    history: PropTypes.any,
    auditLogPath: PropTypes.string,
    name: PropTypes.string,
    subName: PropTypes.string,
    breadcrumbName: PropTypes.string,
    svgClick: PropTypes.func,
    firstTime: PropTypes.func,
    actions: PropTypes.array,
};

export default UnitHeader;
