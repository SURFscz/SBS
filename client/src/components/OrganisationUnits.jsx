import React, {useRef, useState} from "react";
import "./OrganisationUnits.scss";
import {isEmpty, splitListSemantically, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";
import {unitUsage} from "../api";
import ConfirmationDialog from "./confirmation-dialog/ConfirmationDialog";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import ErrorIndicator from "./_redesign/ErrorIndicator";
import SpinnerField from "./_redesign/SpinnerField";

export const OrganisationUnits = ({units, setUnits, setDuplicated}) => {

    const [duplicateIndex, setDuplicateIndex] = useState(-1);
    const [deletedAll, setDeletedAll] = useState(false);
    const [references, setReferences] = useState({});
    const [loading, setLoading] = useState(false);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [removalIndex, setRemovalIndex] = useState(-1);

    const inputRef = useRef(null);

    const focusAfterAdd = () => {
        inputRef.current && inputRef.current.focus();
    }

    const cancelRemoval = () => {
        setReferences({});
        setConfirmationDialogOpen(false);
        setRemovalIndex(-1);
    }

    const internalOnChange = index => e => {
        const value = e.target.value;
        if (units.filter(unit => unit.name.toLowerCase() === value.toLowerCase()).length > 0) {
            setDuplicateIndex(index);
            setDuplicated(true);
        } else {
            setDuplicateIndex(-1);
            setDuplicated(false);
        }
        const newUnits = [...units];
        const unit = newUnits[index];
        unit.name = value;
        newUnits.splice(index, 1, unit);
        setUnits(newUnits);
    }

    const doRemoveUnit = index => {
        units.splice(index, 1);
        const newUnits = [...units];
        setUnits(newUnits);
        if (newUnits.length === 0) {
            setDeletedAll(true);
        }
        if (newUnits.length === new Set(newUnits.map(unit => unit.name.toLowerCase())).size) {
            setDuplicateIndex(-1);
            setDuplicated(false);
        }
    }

    const hasReferences = res => {
        return !isEmpty(res.collaborations) || !isEmpty(res.invitations)
            || !isEmpty(res.collaboration_requests) || !isEmpty(res.api_keys);
    }

    const removeAfterConfirmation = () => {
        doRemoveUnit(removalIndex);
        setConfirmationDialogOpen(false);
        setReferences({});
    }

    const removeUnit = index => e => {
        stopEvent(e);
        const unit = units[index];
        if (unit.organisation_id && unit.id) {
            setLoading(true);
            unitUsage(unit).then(res => {
                setReferences(res);
                if (hasReferences(res)) {
                    setRemovalIndex(index);
                    setConfirmationDialogOpen(true);
                } else {
                    doRemoveUnit(index);
                }
                setLoading(false);
            })
        } else {
            setReferences({});
            doRemoveUnit(index);
        }
    }

    const addUnit = e => {
        stopEvent(e);
        setUnits([...units.concat({name: ""})]);
        setTimeout(() => focusAfterAdd(), 250);
    }

    const renderConfirmation = () => {
        return (
            <div className="remove-unit-confirmation">
                <p>{I18n.t("units.used")}</p>
                <ul>
                    {
                        ["collaborations", "invitations", "collaboration_requests", "organisation_memberships", "api_keys"]
                            .filter(name => !isEmpty(references[name]))
                            .map((name, index) =>
                                <li key={index}>
                                    {`${I18n.t(`units.${name}`)} (${splitListSemantically(references[name],
                                        I18n.t("service.compliancySeparator"))})`}
                                </li>
                            )
                    }
                </ul>
            </div>
        );
    }

    if (loading) {
        return <SpinnerField/>
    }

    if (!deletedAll) {
        units = units.length > 0 ? units : [{name: ""}]
    }

    const unitName = removalIndex !== -1 ? (units[removalIndex] || {}).name : "";
    return (
        <div className="organisation-units sds--text-field ">
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelRemoval}
                                confirm={() => removeAfterConfirmation()}
                                question={I18n.t("units.confirmation", {name: unitName})}
                                closeTimeoutMS={0}
                                isWarning={true}>
                {confirmationDialogOpen && renderConfirmation()}
            </ConfirmationDialog>
            <label>{I18n.t("units.label")}</label>

            {units.map((unit, index) => {
                const refProps = (index + 1) === units.length ? {ref: inputRef} : {};
                return (
                    <div className={`input-field ${index === 0 ? "first" : ""}`} key={index}>
                        <div className="inner-input-field">
                            <input type="text"
                                   value={unit.name}
                                   onChange={internalOnChange(index)}
                                   className={`sds--text-field--input`}
                                   {...refProps}
                            />
                            <div className={`input-field-link input-field-delete`}>
                                <a href={"#"} onClick={removeUnit(index)}>
                                    <TrashIcon/>
                                </a>
                            </div>
                        </div>
                        {duplicateIndex === index &&
                            <ErrorIndicator msg={I18n.t("units.duplicated", {name: unit.name})}
                                            standalone={true}/>
                        }
                    </div>)
            })
            }
            <a className={"add-unit"} href="#" onClick={addUnit}>
                {I18n.t("units.add")}
            </a>

        </div>
    );
}
