import React, {useEffect} from "react";
import "./NotFound.scss";
import SpinnerField from "../components/_redesign/SpinnerField";

export default function RefreshRoute(props) {

    useEffect(() => {
        const path = decodeURIComponent(props.match.params.path);
        props.history.push(path);
    });

    return (
        <SpinnerField/>
    );

}
