import React, {useEffect} from "react";
import "../not-found/NotFound.scss";
import SpinnerField from "../../components/_redesign/spinner-field/SpinnerField";

export default function RefreshRoute(props) {

    useEffect(() => {
        const path = decodeURIComponent(props.match.params.path);
        props.history.push(path);
    });

    return (
        <SpinnerField/>
    );

}
