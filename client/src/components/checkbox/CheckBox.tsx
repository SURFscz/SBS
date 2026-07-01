import React, {ChangeEvent, FC} from "react";
import {Checkbox as SDSCheckbox} from "@surfnet/sds";
import "./CheckBox.scss";

export type CheckBoxProps = {
    name: string;
    value: boolean;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    readOnly?: boolean;
    hide?: boolean;
    bold?: boolean;
    info?: string;
    tooltip?: string;
    className?: string;
};

export const CheckBox: FC<CheckBoxProps> = ({
    name,
    value,
    onChange,
    readOnly = false,
    info,
    tooltip,
    className = "checkbox",
    hide = false,
}) => {
    const innerOnChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onChange?.(e);
        return false;
    };

    return (
        <SDSCheckbox
            name={name}
            value={value}
            onChange={innerOnChange}
            tooltip={tooltip}
            className={className}
            hide={hide}
            readOnly={readOnly}
            info={info}
        />
    );
};

export default CheckBox;
