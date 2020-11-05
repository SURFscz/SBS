import React from "react";
import PropTypes from "prop-types";

import Tab from "./Tab";
import "./Tabs.scss";

class Tabs extends React.Component {
    static propTypes = {
        children: PropTypes.instanceOf(Array).isRequired,
        className: PropTypes.string,
        initialActiveTab: PropTypes.string,
        tabChanged: PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = {
            activeTab: props.initialActiveTab || props.children[0].props.name
        };
    }

    onClickTabItem = tab => this.setState({activeTab: tab},
        () => this.props.tabChanged && this.props.tabChanged(tab));

    render() {
        const {children, className = ""} = this.props;
        const {activeTab} = this.state;

        const filteredChildren = children.filter(child => child);
        const singletonTab = filteredChildren.length === 1;
        return (
            <div>
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
