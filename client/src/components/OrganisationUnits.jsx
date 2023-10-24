import React, {useRef, useState} from "react";
import "./OrganisationUnits.scss";
import {isEmpty, splitListSemantically, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";
import {unitUsage} from "../api";
import ConfirmationDialog from "./ConfirmationDialog";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import ErrorIndicator from "./redesign/ErrorIndicator";
import SpinnerField from "./redesign/SpinnerField";

export const OrganisationUnits = ({units, setUnits}) => {

    const [duplicate, setDuplicate] = useState(-1);
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
        if (units.filter(unit => unit.name.toLowerCase() === value.toLowerCase()).length > 1) {
            setDuplicate(index);
            return stopEvent(e);
        } else {
            setDuplicate(-1);
            const newUnits = [...units];
            const unit = newUnits[index];
            unit.name = value;
            newUnits.splice(index, 1, unit);
            setUnits(newUnits);
        }
    }

    const doRemoveUnit = index => {
        units.splice(index, 1);
        setUnits([...units]);
    }

    const hasReferences = res => {
        return !isEmpty(res.collaborations) || !isEmpty(res.invitations)
            || !isEmpty(res.collaboration_requests);
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
                        ["collaborations", "invitations", "collaboration_requests"]
                            .filter(name => !isEmpty(references[name]))
                            .map((name, index) =>
                                <li key={index}>
                                    {`${I18n.t("units.collaborations")} (${splitListSemantically(references.collaborations,
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

    return (
        <div className="organisation-units sds--text-field ">
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelRemoval}
                                confirm={() => removeAfterConfirmation()}
                                question={I18n.t("units.confirmation")}
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
                            {duplicate === index &&
                                <ErrorIndicator msg={"error"} standalone={true}/>
                            }
                        </div>
                    </div>)
            })
            }
            <a className={"add-unit"} href="#" onClick={addUnit}>
                {I18n.t("units.add")}
            </a>

        </div>
    );
}
