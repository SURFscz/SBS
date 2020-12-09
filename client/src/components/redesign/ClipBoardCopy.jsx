import React from "react";
import "./ClipBoardCopy.scss";

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function ClipBoardCopy({txt, right = false}) {
    return (
        <section className={`copy-to-clipboard ${right ? "right" : ""}`}>
            <CopyToClipboard text={txt}>
                <FontAwesomeIcon icon="copy" onClick={e => {
                    const me = e.target.parentElement;
                    me.classList.add("copied");
                    setTimeout(() => me.classList.remove("copied"), 1250);
                }}/>
            </CopyToClipboard>
        </section>
    );

}