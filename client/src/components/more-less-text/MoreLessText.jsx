import React, {useState} from "react";
import "./MoreLessText.scss";
import I18n from "../../locale/I18n";
import {isEmpty, stopEvent} from "../../utils/Utils";

export const MoreLessText = ({txt, initialShowMore = true}) => {

    const cutoffNumber = 190;

    const [showMore, setShowMore] = useState(txt && txt.length > cutoffNumber
        && txt.substring(cutoffNumber).indexOf(" ") > 0 && initialShowMore);

    const toggleShowMore = e => {
        stopEvent(e);
        setShowMore(!showMore);
    }

    const txtToDisplay = isEmpty(txt) ? txt : txt.substring(0, cutoffNumber + txt.substring(cutoffNumber).indexOf(" "));
    return (
        <span className={"more-less-txt description"}>
            {showMore ? txtToDisplay : txt}
            {showMore && <a className={"show-more"} href="/more" onClick={toggleShowMore}>
                {I18n.t("forms.showMore")}
            </a>}
            {(!showMore && txt !== txtToDisplay) &&
                <a className={"show-more"} href="/less" onClick={toggleShowMore}>
                    {I18n.t("forms.hideSome")}
                </a>}
        </span>
    )
}
