import React from "react";
import PropTypes from "prop-types";

import Tab from "./Tab";
import "./Tabs.scss";

class Tabs extends React.Component {

    static propTypes = {
        children: PropTypes.instanceOf(Array).isRequired,
        className: PropTypes.string,
        activeTab: PropTypes.string,
        tabChanged: PropTypes.func
    };

    onClickTabItem = tab => {
        const {tabChanged} = this.props;
        tabChanged(tab);
    }

    render() {
        const {children, className = ""} = this.props;
        const activeTab = this.props.activeTab || children[0].props.name
        const filteredChildren = children.filter(child => child);

        return (
            <>
                <div className="tabs-container">
                    {<div className={`tabs ${className}`}>

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
                </div>
                {filteredChildren.map(child => {
                    if (child.props.name !== activeTab) {
                        return undefined;
                    }
                    return child.props.children;
                })}

            </>
        );
    }
}

export default Tabs;
