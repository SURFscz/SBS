import React from "react";
import "./ClipBoardCopy.scss";
import {ReactComponent as Duplicate} from "../../icons/duplicate.svg";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function ClipBoardCopy({txt, right = false}) {
    return (
        <section className={`copy-to-clipboard ${right ? "right" : ""}`}>
            <CopyToClipboard text={txt}>
                <Duplicate onClick={e => {
                    const me = e.target;
                    me.classList.add("copied");
                    setTimeout(() => me.classList.remove("copied"), 1250);
                }}/>
            </CopyToClipboard>
        </section>
    );

}