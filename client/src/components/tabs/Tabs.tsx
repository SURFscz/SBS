import React, {FC, ReactElement, ReactNode} from "react";

import Tab from "../tab/Tab";
import "./Tabs.scss";

export type TabPaneChildProps = {
    name: string;
    label: string;
    notifier?: boolean | number | null;
    readOnly?: boolean;
    children?: ReactNode;
};

export type TabsProps = {
    children: Array<ReactElement<TabPaneChildProps> | null | false | undefined> | ReactElement<TabPaneChildProps>;
    className?: string;
    activeTab?: string;
    tabChanged: (tab: string) => void;
    busy?: boolean;
};

export const Tabs: FC<TabsProps> = ({
    children,
    busy,
    className = "",
    activeTab: activeTabProp,
    tabChanged
}) => {
    const onClickTabItem = (tab: string) => {
        tabChanged(tab);
    };

    const childList = (Array.isArray(children) ? children : [children]).filter(
        (child): child is ReactElement<TabPaneChildProps> => Boolean(child)
    );
    let activeTab = activeTabProp || childList[0].props.name;
    if (!childList.some(child => child.props && child.props.name === activeTab)) {
        activeTab = (childList[0] || {props: {name: activeTab}}).props.name;
    }
    return (
        <>
            <div className="tabs-container">
                {<div className={`tabs ${className}`}>

                    {childList.map(child => {
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
                                onClick={onClickTabItem}
                                className={className}
                            />
                        );
                    })}
                </div>}
            </div>
            {childList.map(child => {
                if (child.props.name !== activeTab) {
                    return undefined;
                }
                return child.props.children;
            })}

        </>
    );
};

export default Tabs;
