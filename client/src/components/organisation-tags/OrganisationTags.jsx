import React, {Fragment, useEffect, useRef, useState} from "react";
import "./OrganisationTags.scss";
import {isEmpty, splitListSemantically, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import {tagUsage} from "../../api";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg?react";
import ErrorIndicator from "../redesign/error-indicator/ErrorIndicator";
import SpinnerField from "../redesign/spinner-field/SpinnerField";
import Select from "react-select";
import {validTagName} from "../../validations/regExps";

export const OrganisationTags = ({tags, setTags, setDuplicated, allUnits}) => {

    const [duplicateIndex, setDuplicateIndex] = useState(-1);
    const [deletedAll, setDeletedAll] = useState(false);
    const [references, setReferences] = useState({});
    const [loading, setLoading] = useState(false);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [removalIndex, setRemovalIndex] = useState(-1);

    const inputRef = useRef(null);

    useEffect(() => {
        const duplicateNames = tags
            .map(tag => tag.tag_value.trim().toLowerCase())
            .filter(tagValue => !isEmpty(tagValue));
        const duplicateIndex = tags.findIndex(tag => {
            const currentValue = tag.tag_value.trim().toLowerCase();
            if (isEmpty(currentValue)) {
                return false;
            }
            return duplicateNames.filter(tagValue => tagValue === currentValue).length > 1;
        });
        setDuplicateIndex(duplicateIndex);
        setDuplicated(duplicateIndex !== -1);
    }, [tags, setDuplicated]);

    const focusAfterAdd = () => {
        inputRef.current && inputRef.current.focus();
    }

    const cancelRemoval = () => {
        setReferences({});
        setConfirmationDialogOpen(false);
        setRemovalIndex(-1);
    }

    const internalOnChangeUnit = index => val => {
        const newTags = [...tags];
        const tag = newTags[index];
        tag.units = val;
        newTags.splice(index, 1, tag);
        setTags(newTags);
    }

    const internalOnChange = index => e => {
        const value = e.target.value;
        const newTags = [...tags];
        const tag = newTags[index];
        tag.tag_value = value;
        newTags.splice(index, 1, tag);
        setTags(newTags);
    }

    const doRemoveTag = index => {
        const newTags = tags.filter((_, currentIndex) => currentIndex !== index);
        setTags(newTags);
        if (newTags.length === 0) {
            setDeletedAll(true);
        }
        if (newTags.length === new Set(newTags.map(tag => tag.tag_value.toLowerCase())).size) {
            setDuplicateIndex(-1);
            setDuplicated(false);
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
        if (tag.id) {
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
        setTags([...tags.concat({tag_value: "", units: [], is_default: true})]);
        setTimeout(() => focusAfterAdd(), 250);
    }


    const unitOptions = tag => {
        return allUnits.filter(unit => !tag.units.find(u => u.id === unit.id));
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
        tags = tags.length > 0 ? tags : [{tag_value: "", units: [], is_default: true}]
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
                    <Fragment key={index}>
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
                            isDisabled={isEmpty(tag.tag_value)}
                            placeholder={I18n.t("organisationDetails.labels.defaultForPlaceholder")}
                            onChange={internalOnChangeUnit(index)}
                            styles={styles}
                            getOptionValue={option => option.name}
                            getOptionLabel={option => option.name}
                            isMulti={true}
                            options={unitOptions(tag)}
                            isSearchable={false}
                            isClearable={false}
                        />
                        <div className={`input-field-link input-field-delete`}>
                            <a href={"#"} onClick={removeTag(index)}>
                                <TrashIcon/>
                            </a>
                        </div>
                        {duplicateIndex === index &&
                            <ErrorIndicator msg={I18n.t("tags.duplicated", {name: tag.tag_value})}
                                            standalone={true}/>
                        }
                        {!isEmpty(tag.tag_value.trim()) && !validTagName(tag.tag_value) &&
                            <ErrorIndicator msg={I18n.t("tags.validation")}
                                            standalone={true}/>
                        }
                    </Fragment>)
            })
            }
            <a className={"add-tag"} href="#" onClick={addTag}>
                {I18n.t("tags.add")}
            </a>

        </div>
    );
}
