import React, {useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Tooltip} from "@surfnet/sds";
import "./OrganisationUnits.scss";
import {isEmpty, removeDuplicates, splitListSemantically, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";
import {unitUsage} from "../api";
import ConfirmationDialog from "./ConfirmationDialog";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import {current} from "immer";

export const OrganisationUnits = ({units, setUnits, readOnly}) => {

    const [duplicate, setDuplicate] = useState(-1);
    const [references, setReferences] = useState({});
    const [loading, setLoading] = useState(false);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationDialogAction, setConfirmationDialogAction] = useState(false);

    const inputRef = useRef(null);


    useEffect(() => {
        inputRef.current && inputRef.current.focus();
    });

    const cancelRemoval = () => {
        setReferences({});
        setConfirmationDialogOpen(false);
    }

    const internalOnChange = index => e => {
        const name = e.target.value;
        if (units.filter(unit => unit.name.toLowerCase() === name.toLowerCase()).length > 1) {
            setDuplicate(index);
            return stopEvent(e);
        } else {
            setDuplicate(-1);
            const unit = units[index];
            unit.name = name;
            units.splice(index, 1, unit);
            setUnits([...units]);
        }
    }

    const doRemoveUnit = index => {
        units.splice(index, 1);
        setUnits(...units);
    }

    const hasReferences = res => {
        return !isEmpty(res.collaborations) || !isEmpty(res.invitations)
            || !isEmpty(res.collaboration_requests);
    }

    const removeUnit = index => e => {
        stopEvent(e);
        const unit = units[index];
        if (unit.organisation_id && unit.id) {
            setLoading(true);
            unitUsage(unit).then(res => {
                setReferences(res);
                if (hasReferences(res)) {
                    setConfirmationDialogOpen(true);
                    setConfirmationDialogAction(() => {
                        doRemoveUnit(index);
                        setReferences({});
                        setConfirmationDialogOpen(false);
                    });
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
        setUnits(...units.concat({name: ""}));
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

    return (
        <div className="organisation-units">
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelRemoval}
                                confirm={confirmationDialogAction}
                                question={I18n.t("units.confirmation")}
                                closeTimeoutMS={0}
                                isWarning={true}>
                {confirmationDialogOpen && renderConfirmation()}
            </ConfirmationDialog>
            <label>{I18n.t("units.label")}</label>

            {units.map((unit, index) =>
                <div className="inner-input-field" key={index}>
                    <input type="text"
                           value={unit.name}
                           onChange={internalOnChange}
                           onBlur={onBlur}
                           ref={ref => (index + 1) === units.length ? inputRef : null}
                           className={`sds--text-field--input`}
                    />
                    <div className={`input-field-link`}>
                        <a href={"#"} onClick={removeUnit(index)}>
                            <TrashIcon/>
                        </a>
                    </div>
                </div>)
            }
            <a className={"add-unit"} href="#" onClick={addUnit}>
                {I18n.t("units.add")}
            </a>

        </div>
    );
}
