import React from "react";

import {ReactComponent as NotFoundIcon} from "../../icons/image-not-found.svg";

export default function Logo({src, className = "", alt = ""}) {
    return src ? <img src={`data:image/jpeg;base64,${src}`} alt={alt} className={className}/> : <NotFoundIcon/>;
}