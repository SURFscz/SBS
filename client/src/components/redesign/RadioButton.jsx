import React from "react";
import "./RadioButton.scss";
import I18n from "i18n-js";
import {RadioOptions} from "@surfnet/sds";

export default function RadioButton({label, name, value, onChange, tooltip, disabled = false}) {

    const internalOnChange = () => {
        onChange(!value);
    }

    return <RadioOptions label={label}
                         onChange={internalOnChange}
                         value={value}
                         name={name}
                         falseLabel={I18n.t("forms.no")}
                         trueLabel={I18n.t("forms.yes")}
                         tooltip={tooltip}
                         disabled={disabled}/>
}
