import React from "react";
import PropTypes from "prop-types";

import Tab from "../tab/Tab";
import "./Tabs.scss";

class Tabs extends React.Component {

    static propTypes = {
        children: PropTypes.instanceOf(Array).isRequired,
        className: PropTypes.string,
        activeTab: PropTypes.string,
        tabChanged: PropTypes.func,
        busy: PropTypes.bool
    };

    onClickTabItem = tab => {
        const {tabChanged} = this.props;
        tabChanged(tab);
    }

    render() {
        const {children, busy, className = ""} = this.props;
        let activeTab = this.props.activeTab || children[0].props.name;
        const filteredChildren = children.filter(child => child);
        if (!filteredChildren.some((child => child.props && child.props.name === activeTab))) {
            activeTab = (filteredChildren[0] || {props: {name: activeTab}}).props.name
        }
        return (
            <>
                <div className="tabs-container">
                    {<div className={`tabs ${className}`}>

                        {filteredChildren.map(child => {
                            const {label, name, notifier, readOnly} = child.props;

                            return (
                                <Tab
                                    activeTab={activeTab}
                                    readOnly={readOnly}
                                    key={name}
                                    name={name}
                                    busy={busy}
                                    notifier={notifier}
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
