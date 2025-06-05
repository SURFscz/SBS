import React from "react";

import {ReactComponent as NotFoundIcon} from "../../../icons/image-not-found.svg";
import {isEmpty} from "../../../utils/Utils";
import {srcUrl} from "../../../utils/Image";

export default function Logo({src, className = "", alt = ""}) {
    if (isEmpty(src)) {
        return <NotFoundIcon/>;
    }
    const urlSrc = srcUrl(src, "jpeg");
    return <img src={urlSrc} alt={alt} className={className}/>


}
