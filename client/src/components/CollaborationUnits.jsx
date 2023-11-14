import React from "react";
import "./CollaborationUnits.scss";
import I18n from "../locale/I18n";
import SelectField from "./SelectField";
import {rawGlobalUserRole, ROLES} from "../utils/UserRole";

export const CollaborationUnits = ({
                                       selectedUnits,
                                       allUnits,
                                       setUnits,
                                       user,
                                       organisation,
                                       label = I18n.t("units.collaboration"),
                                       readOnly = false
                                   }) => {


    const selectedUnitsChanged = selectedOptions => {
        if (selectedOptions === null) {
            setUnits([]);
        } else {
            const newSelectedOptions = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            setUnits(newSelectedOptions);
        }
    }
    const userRole = rawGlobalUserRole(user, organisation, null, null, true);
    if (userRole === ROLES.ORG_MANAGER) {
        const membershipUnits = user.organisation_memberships
            .find(m => m.user_id === user.id)
            .units.map(unit => ({...unit, value: unit.id}));
        //fixate the selectedUnits that are not in the organisationMembership
        selectedUnits.forEach(option => option.isFixed = !membershipUnits.some(unit => unit.value === option.value))
        //remove the units from allUnits that are not in the organisationMembership
        allUnits = allUnits.filter(option => membershipUnits.some(unit => unit.value === option.value))
    }

    const options = allUnits.filter(unit => !selectedUnits.find(selectedUnit => selectedUnit.value === unit.value));
    return (
        <SelectField value={selectedUnits}
                     options={options}
                     name={label}
                     disabled={readOnly}
                     searchable={false}
                     isClearable={true}
                     isMulti={true}
                     placeholder={I18n.t("units.unitsPlaceHolder")}
                     onChange={selectedUnitsChanged}/>

    );
}
