import React from "react";
import PropTypes from "prop-types";

import Tab from "./Tab";
import "./Tabs.scss";

class Tabs extends React.Component {
    static propTypes = {
        children: PropTypes.instanceOf(Array).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            activeTab: this.props.initialActiveTab || this.props.children[0].props.label
        };
    }

    onClickTabItem = tab => this.setState({activeTab: tab},
        () => this.props.tabChanged && this.props.tabChanged(tab));

    render() {
        const {children, className} = this.props;
        const {activeTab} = this.state;

        const filteredChildren = children.filter(child => child);
        const singletonTab = filteredChildren.length === 1;
        return (
            <div>
                {!singletonTab && <div className="tabs">

                    {filteredChildren.map(child => {
                        const {label} = child.props;

                        return (
                            <Tab
                                activeTab={activeTab}
                                key={label}
                                label={label}
                                onClick={this.onClickTabItem}
                                className={className}
                            />
                        );
                    })}
                </div>}
                {filteredChildren.map(child => {
                    if (child.props.label !== activeTab) return undefined;
                    return child.props.children;
                })}
            </div>
        );
    }
}

export default Tabs;
