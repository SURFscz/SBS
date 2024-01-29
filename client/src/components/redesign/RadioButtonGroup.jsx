import React from "react";
import "./RadioButton.scss";
import {RadioOptions, RadioOptionsOrientation} from "@surfnet/sds";

export default function RadioButtonGroup({
                                             label,
                                             name,
                                             value,
                                             onChange,
                                             tooltip,
                                             values,
                                             labelResolver,
                                             disabled = false,
                                        horizontal=true
                                         }) {

    const internalOnChange = e => {
        const id = e.target.id;
        onChange(id ? id.replace(`${name}_`, "") : id);
    }

    return <RadioOptions label={label}
                         onChange={internalOnChange}
                         value={value}
                         name={name}
                         labels={values}
                         orientation={horizontal ? RadioOptionsOrientation.row : RadioOptionsOrientation.column}
                         isMultiple={true}
                         labelResolver={labelResolver}
                         tooltip={tooltip}
                         disabled={disabled}/>
}
