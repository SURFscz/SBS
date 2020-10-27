import React from "react";
import "./BreadCrumb.scss";
import {ReactComponent as ChevronRight} from "../icons/chevron-right.svg";
import {AppStore} from "../stores/AppStore";
import {Link} from "react-router-dom";

export const BreadCrumb = () => {

    const {paths} = AppStore.useState(state => state.breadcrumb);

    return (
        <div className="bread-crumb-container">
            <div className="bread-crumb">
                {paths.map((p, i) =>
                    <div key={i}>
                        {i !== 0 && <ChevronRight/>}
                        <Link to={p.path} className={(i + 1) === paths.length ? "last" : "link"}>{p.value}</Link>
                    </div>)}
            </div>
        </div>
    );
}