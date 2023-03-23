import React from "react";
import "./ClipBoardCopy.scss";
import {ReactComponent as Duplicate} from "../../icons/duplicate.svg";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function ClipBoardCopy({txt, right = false, transparentBackground = false, children = null}) {
    return (
        <section className={`copy-to-clipboard ${right ? "right" : ""} ${transparentBackground ? "transparent" : ""}`}>
            <CopyToClipboard text={txt}>
                <>
                    {children}
                    <Duplicate onClick={e => {
                        const me = e.target;
                        me.classList.add("copied");
                        setTimeout(() => me.classList.remove("copied"), 1250);
                    }}/>
                </>
            </CopyToClipboard>
        </section>
    );

}