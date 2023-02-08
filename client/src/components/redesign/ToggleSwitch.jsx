import React from "react";

import { Switch} from "@surfnet/sds";
import {pseudoGuid} from "../../utils/Utils";

export default function ToggleSwitch({value, onChange, disabled = false, tooltip = undefined}) {

    return (
        <Switch name={pseudoGuid()} value={value} onChange={onChange} tooltip={tooltip} disabled={disabled}/>
    )

}
