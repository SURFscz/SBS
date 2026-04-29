import React from "react";
import "./ClipBoardCopy.scss";
import Duplicate from "../../../icons/duplicate.svg?react";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function ClipBoardCopy({txt, right = false, transparentBackground = false}) {
    return (
        <CopyToClipboard text={txt}>
            <section
                className={`copy-to-clipboard ${right ? "right" : ""} ${transparentBackground ? "transparent" : ""}`}
                onClick={e => {
                    const me = e.target;
                    me.classList.add("copied");
                    setTimeout(() => me.classList.remove("copied"), 1250);
                }}>
                <Duplicate/>
            </section>
        </CopyToClipboard>
    );

}
