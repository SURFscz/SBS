import React from "react";
import "./SpinnerMarathonField.scss";
import {Loader} from "@surfnet/sds";
import DOMPurify from "dompurify";

export default function SpinnerMarathonField({message}) {
    return (
        <Loader className="marathon">
            <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(message)}}/>
        </Loader>
    );
}