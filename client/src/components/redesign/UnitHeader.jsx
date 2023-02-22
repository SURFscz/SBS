import React from "react";
import "./UnitHeader.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Logo from "./Logo";
import {ReactComponent as ChevronUp} from "../../icons/chevron-up.svg";
import {ReactComponent as ChevronDown} from "../../icons/chevron-down.svg";
import {isEmpty} from "../../utils/Utils";
import PropTypes from "prop-types";
import UnitHeaderActionMenu from "./UnitHeaderActionMenu";

class UnitHeader extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDropDown: true
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

    render() {
        const {
            obj, history, auditLogPath, name, breadcrumbName, svgClick, firstTime, actions, dropDownTitle, children,
            customAction
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
                        {obj.name && <h2>{obj.name}</h2>}
                        {obj.organisation && <span className="name">{obj.organisation.name}</span>}
                        <div className="children">
                            {children}
                        </div>
                    </div>
                    {!isEmpty(actions) &&
                    <div className="action-menu-container">
                        {this.renderDropDownLink(showDropDown, dropDownTitle)}
                        {showDropDown && <UnitHeaderActionMenu actions={actions}
                                                               firstTime={firstTime}
                                                               auditLogPath={auditLogPath}
                                                               close={() => this.setState({showDropDown: false})}
                                                               history={history}
                                                               queryParam={queryParam}/>}
                    </div>}
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
    dropDownTitle: PropTypes.string,
    name: PropTypes.string,
    breadcrumbName: PropTypes.string,
    svgClick: PropTypes.func,
    firstTime: PropTypes.func,
    actions: PropTypes.array,
};

export default UnitHeader;
