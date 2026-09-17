import React, {FC, ReactNode} from "react";
import AlertIcon from "../../icons/alert-circle.svg?react";
import "./Tab.scss";
import {BadgeNumber} from "@surfnet/sds";

export type TabProps = {
    activeTab: string;
    label: string;
    name: string;
    readOnly?: boolean;
    icon?: ReactNode;
    className?: string;
    onClick: (name: string) => void;
    busy?: boolean;
    notifier?: boolean | number | null;
};

export const Tab: FC<TabProps> = ({
    activeTab,
    className = "",
    label,
    name,
    icon,
    notifier,
    readOnly,
    busy,
    onClick
}) => {
    const handleClick = () => {
        if (!readOnly) {
            onClick(name);
        }
    };

    let tabClassName = className;
    tabClassName += ` tab ${name}`;

    if (activeTab === name) {
        tabClassName += " active";
    }
    if (readOnly) {
        tabClassName += " read-only";
    }
    if (busy) {
        tabClassName += " busy";
    }
    let chipCount: ReactNode = null;
    let tabLabel = label;
    if (tabLabel && tabLabel.indexOf("(") > -1) {
        const count = tabLabel.substring(tabLabel.indexOf("(") + 1, tabLabel.indexOf(")"));
        tabLabel = tabLabel.substring(0, tabLabel.indexOf("(") - 1);
        chipCount = <BadgeNumber value={count} small={true}/>;
    }
    return (
        <div className={tabClassName} onClick={handleClick}>
            {notifier && <span className="notifier"><AlertIcon/></span>}
            <button className={"tab-label"}>{icon && icon}{tabLabel}{chipCount}</button>
        </div>
    );
};

export default Tab;
