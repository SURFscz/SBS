import React, {useRef, useState} from "react";
import "./OrganisationTags.scss";
import {isEmpty, splitListSemantically, stopEvent} from "../utils/Utils";
import I18n from "../locale/I18n";
import {tagUsage} from "../api";
import ConfirmationDialog from "./ConfirmationDialog";
import {ReactComponent as TrashIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import ErrorIndicator from "./redesign/ErrorIndicator";
import SpinnerField from "./redesign/SpinnerField";
import Select from "react-select";

export const OrganisationTags = ({tags, setTags, setDuplicated, allUnits}) => {

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
        if (tags.filter(tag => tag.name.toLowerCase() === value.toLowerCase()).length > 0) {
            setDuplicateIndex(index);
            setDuplicated(true);
        } else {
            setDuplicateIndex(-1);
            setDuplicated(false);
        }
        const newTags = [...tags];
        const tag = newTags[index];
        tag.name = value;
        newTags.splice(index, 1, tag);
        setTags(newTags);
    }

    const doRemoveTag = index => {
        tags.splice(index, 1);
        setTags([...tags]);
        if (tags.length === 0) {
            setDeletedAll(true);
        }
    }

    const hasReferences = res => {
        return !isEmpty(res.collaborations);
    }

    const removeAfterConfirmation = () => {
        doRemoveTag(removalIndex);
        setConfirmationDialogOpen(false);
        setReferences({});
    }

    const removeTag = index => e => {
        stopEvent(e);
        const tag = tags[index];
        if (tag.organisation_id && tag.id) {
            setLoading(true);
            tagUsage(tag).then(res => {
                setReferences(res);
                if (hasReferences(res)) {
                    setRemovalIndex(index);
                    setConfirmationDialogOpen(true);
                } else {
                    doRemoveTag(index);
                }
                setLoading(false);
            })
        } else {
            setReferences({});
            doRemoveTag(index);
        }
    }

    const addTag = e => {
        stopEvent(e);
        setTags([...tags.concat({tag_value: "", is_default: true})]);
        setTimeout(() => focusAfterAdd(), 250);
    }

    const renderConfirmation = () => {
        return (
            <div className="remove-tag-confirmation">
                <p>{I18n.t("units.used")}</p>
                <ul>
                    {
                        ["collaborations"]
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
        tags = tags.length > 0 ? tags : [{tag_value: ""}]
    }

    const tagValue = removalIndex !== -1 ? (tags[removalIndex] || {}).tag_value : "";
    const styles = {
        multiValue: (base, state) => state.data.isFixed ? {
            ...base,
            backgroundColor: 'var(--sds--color--gray--200)!important'
        } : base,
        multiValueRemove: (base, state) => state.data.isFixed ? {...base, display: 'none'} : base
    };

    return (
        <div className="organisation-tags sds--text-field ">
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelRemoval}
                                confirm={() => removeAfterConfirmation()}
                                question={I18n.t("tags.confirmation", {name: tagValue})}
                                closeTimeoutMS={0}
                                isWarning={true}>
                {confirmationDialogOpen && renderConfirmation()}
            </ConfirmationDialog>
            <label>{I18n.t("tags.label")}</label>
            <label>{I18n.t("organisationDetails.labels.defaultFor")}</label>

            {tags.map((tag, index) => {
                const refProps = (index + 1) === tags.length ? {ref: inputRef} : {};
                return (
                    <>
                            <input type="text"
                                   value={tag.tag_value}
                                   onChange={internalOnChange(index)}
                                   className={`sds--text-field--input`}
                                   {...refProps}
                            />
                            <Select
                                className={`input-units-inner`}
                                classNamePrefix={"units-inner"}
                                value={tag.units}
                                placeholder={I18n.t("organisationDetails.labels.defaultForPlaceholder")}
                                onChange={val => alert(JSON.stringify(val))}
                                styles={styles}
                                isMulti={true}
                                options={allUnits.map(unit => ({name: unit.name, label: unit.name}))}
                                isSearchable={false}
                                isClearable={false}
                            />
                            <div className={`input-field-link input-field-delete`}>
                                <a href={"#"} onClick={removeTag(index)}>
                                    <TrashIcon/>
                                </a>
                            </div>
                        {duplicateIndex === index &&
                            <ErrorIndicator msg={I18n.t("units.duplicated", {name: tag.tag_value})}
                                            standalone={true}/>
                        }
                    </>)
            })
            }
            <a className={"add-tag"} href="#" onClick={addTag}>
                {I18n.t("tags.add")}
            </a>

        </div>
    );
}
