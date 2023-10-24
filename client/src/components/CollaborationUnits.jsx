import React from "react";
import "./CollaborationUnits.scss";
import I18n from "../locale/I18n";
import SelectField from "./SelectField";

export const CollaborationUnits = ({selectedUnits, allUnits, setUnits, label = I18n.t("units.collaboration")}) => {


    const selectedUnitsChanged = selectedOptions => {
        if (selectedOptions === null) {
            setUnits([]);
        } else {
            const newSelectedOptions = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            setUnits(newSelectedOptions);
        }
    }

    return (<SelectField value={selectedUnits}
                         options={allUnits
                             .filter(unit => !selectedUnits.find(selectedUnit => selectedUnit.value === unit.value))}
                         name={label}
                         isMulti={true}
                         placeholder={I18n.t("units.unitsPlaceHolder")}
                         onChange={selectedUnitsChanged}/>

    );
}
