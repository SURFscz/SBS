import React from "react";
import "./BreadCrumb.scss";
import {ReactComponent as ChevronRight} from "../icons/chevron-right.svg";
import {AppStore} from "../stores/AppStore";
import {Link} from "react-router-dom";

export const BreadCrumb = () => {

    const {paths} = AppStore.useState(state => state.breadcrumb);
    const {sideComponent} = AppStore.useState(state => state);

    return (
        <div className="bread-crumb-container">
            <div className="bread-crumb">
                {paths.map((p, i) =>
                    <div className="path" key={i}>
                        {i !== 0 && <ChevronRight/>}
                        {(i + 1) !== paths.length && <Link to={p.path} className={"link"}>{p.value}</Link>}
                        {(i + 1) === paths.length && <span className={"last"}>{p.value}</span>}
                    </div>)}
                {sideComponent}
            </div>

        </div>
    );
}