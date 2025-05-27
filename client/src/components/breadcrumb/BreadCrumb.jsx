import React from "react";
import "./BreadCrumb.scss";
import {ReactComponent as ArrowRight} from "../../icons/arrow-right-2.svg";
import {AppStore} from "../../stores/AppStore";
import {Link} from "react-router-dom";
import {isEmpty} from "../../utils/Utils";
import {clearFlash} from "../../utils/Flash";
import DOMPurify from "dompurify";
import I18n from "../../locale/I18n";

export const BreadCrumb = () => {

    const {paths} = AppStore.useState(state => state.breadcrumb);

    if (isEmpty(paths)) {
        return null;
    }
    const value = paths[paths.length - 1].value
    let name = "";
    if (value === I18n.t("home.edit") || value === I18n.t("breadcrumb.history")) {
        const namePart = paths[paths.length - 2];
        if (!isEmpty(namePart)) {
            name = namePart.value
        }
    }
    document.title = "SRAM - " + paths[paths.length - 1].value + (isEmpty(name) ? "" : ` ${name}`);

    return (
        <nav className="sds--breadcrumb sds--text--body--small" aria-label="breadcrumbs">
            <ol className="sds--breadcrumb--list">
                {paths.map((p, i) =>
                    <li key={i}>
                        {i !== 0 && <ArrowRight/>}
                        {((i + 1) !== paths.length && p.path) &&
                            <Link to={p.path} onClick={() => clearFlash()}>
                                {<span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                            </Link>}
                        {((i + 1) !== paths.length && !p.path) &&
                        <span className={"last"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                        {(i + 1) === paths.length &&
                        <span className={"last"} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                    </li>)}
            </ol>

        </nav>
    );
}
