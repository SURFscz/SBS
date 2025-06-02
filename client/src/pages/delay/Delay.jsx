import React, {useEffect, useState} from "react";
import "./Delay.scss";
import CountDownDialog from "../../components/countdown-dialog/CountDownDialog";
import Waiting from "../../icons/undraw_season_change_f99v.svg";

const counterTimeOut = 20;

export default function Delay({history}) {

    const [counter, setCounter] = useState(counterTimeOut);
    const [serviceName, setServiceName] = useState(null);

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        setServiceName(urlSearchParams.get("service_name"));
    }, [])

    if (counter > 0) {
        setTimeout(() => setCounter(counter - 1), 1000);
    } else {
        history.push(`/service-aup${window.location.search}`);
    }

    return (
        <div className="mod-delay">
            <CountDownDialog
                serviceName={serviceName}
                isOpen={true}
                counter={counter}/>
            <img className="waiting"
                 src={Waiting}
                 alt="waiting"/>
        </div>
    )
}
