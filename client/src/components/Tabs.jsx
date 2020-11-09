import React from "react";
import PropTypes from "prop-types";

import Tab from "./Tab";
import "./Tabs.scss";

class Tabs extends React.Component {

    static propTypes = {
        children: PropTypes.instanceOf(Array).isRequired,
        className: PropTypes.string,
        standAlone: PropTypes.bool,
        activeTab: PropTypes.bool,
        tabChanged: PropTypes.func
    };

    onClickTabItem = tab => {
        const {tabChanged} = this.props;
        tabChanged(tab);
    }

    render() {
        const {children, className = "", standAlone = false} = this.props;
        const activeTab = this.props.activeTab || children[0].props.name
        const filteredChildren = children.filter(child => child);

        return (
            <div>
                {<div className={`tabs ${className} ${standAlone ? " standalone" : ""}`}>

                    {filteredChildren.map(child => {
                        const {label, name, icon} = child.props;

                        return (
                            <Tab
                                activeTab={activeTab}
                                icon={icon}
                                key={name}
                                name={name}
                                label={label}
                                onClick={this.onClickTabItem}
                                className={className}
                            />
                        );
                    })}
                </div>}
                {filteredChildren.map(child => {
                    if (child.props.name !== activeTab) {
                        return undefined;
                    }
                    return child.props.children;
                })}
            </div>
        );
    }
}

export default Tabs;
