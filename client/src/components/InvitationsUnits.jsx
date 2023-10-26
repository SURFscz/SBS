import React, {useState} from "react";
import "./InvitationUnits.scss";
import I18n from "../locale/I18n";
import RadioButtonGroup from "./redesign/RadioButtonGroup";
import CheckBox from "./CheckBox";

export const InvitationsUnits = ({allUnits, selectedUnits, setUnits}) => {

    const [unitOption, setUnitOption] = useState("all");

    const onChange = index => e => {
        const checked = e.target.checked;
        const unit = allUnits[index];
        if (checked) {
            selectedUnits.push(unit);
            setUnits([...selectedUnits])
        } else {
            setUnits(selectedUnits.filter(u => u.id !== unit.id));
        }
    }

    const changeUnitOption = option => {
        setUnitOption(option);
        setUnits([]);
    }

    return (
        <div className="invitation-units sds--text-field">
            <div className={"radio-button-group"}>
                <RadioButtonGroup name={"unit"}
                                  label={I18n.t("units.invitationLabel")}
                                  value={unitOption}
                                  values={["all", "specify"]}
                                  onChange={changeUnitOption}
                                  tooltip={I18n.t("units.invitationTooltip")}
                                  labelResolver={label => I18n.t(`units.${label}`)}/>
            </div>

            {unitOption !== "all" && allUnits.map((unit, index) => {
                const selected = selectedUnits.some(u => u.id === unit.id);
                return (
                    <div className={`checkbox-unit ${selected ? "selected" : ""}`} key={index}>
                        <CheckBox name={`check-${index}`}
                                  value={selected}
                                  onChange={onChange(index)}
                                  info={unit.name}/>
                    </div>)
            })}
        </div>
    )
}
