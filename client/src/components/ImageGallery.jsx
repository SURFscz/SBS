import React from "react";
import "./ImageGallery.scss"
import {Accordion} from "@surfnet/sds";
import I18n from "../locale/I18n";
import {ReactComponent as ArrowDownIcon} from "@surfnet/sds/icons/functional-icons/arrow-down-2.svg";
import  {useEffect, useState} from "react";


export default function ImageGallery({imageSelected}) {

    const [toggleMore, setToggleMore] = useState(false);
    const images = []

    useEffect(() => {
    }, []);

    return (
        <div className="mod-image-gallery">
            <ArrowDownIcon />
        </div>
    );
}
