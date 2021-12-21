import React from "react";
import "./BreadCrumb.scss";
import {ReactComponent as ChevronRight} from "../icons/chevron-right.svg";
import {AppStore} from "../stores/AppStore";
import {Link} from "react-router-dom";
import {isEmpty} from "../utils/Utils";
import {clearFlash} from "../utils/Flash";

export const BreadCrumb = () => {

    const {paths} = AppStore.useState(state => state.breadcrumb);
    const {sideComponent} = AppStore.useState(state => state);

    if (isEmpty(paths) && isEmpty(sideComponent)) {
        return null;
    }

    return (
        <div className="bread-crumb-container">
            <div className="bread-crumb">
                {paths.map((p, i) =>
                    <div className="path" key={i}>
                        {i !== 0 && <ChevronRight/>}
                        {((i + 1) !== paths.length && p.path) &&
                            <Link to={p.path} onClick={() => clearFlash()} className={"link"}>{<span dangerouslySetInnerHTML={{__html: p.value}}/>}</Link>}
                        {((i + 1) !== paths.length && !p.path) &&
                        <span className={"last"} dangerouslySetInnerHTML={{__html: p.value}}/>}
                        {(i + 1) === paths.length &&
                        <span className={"last"} dangerouslySetInnerHTML={{__html: p.value}}/>}
                    </div>)}
                {sideComponent}
            </div>

        </div>
    );
}