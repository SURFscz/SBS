import React from "react";
import "./RadioButton.scss";
import I18n from "../../locale/I18n";
import {RadioOptions} from "@surfnet/sds";

export default function RadioButton({label, name, value, onChange, tooltip, disabled = false}) {

    const internalOnChange = e => {
        const id = e.target.id;
        const yesId = `${name}_${I18n.t("forms.yes")}`;
        onChange(id === yesId);
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
