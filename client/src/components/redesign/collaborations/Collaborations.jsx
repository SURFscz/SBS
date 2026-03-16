import React, {useCallback, useEffect, useState} from "react";
import {ReactComponent as TreeSwing} from "../../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent, tagArraySort, unitArraySort} from "../../../utils/Utils";
import I18n from "../../../locale/I18n";
import Entities from "../entities/Entities";
import Button from "../../button/Button";
import {allCollaborationsOptimized, myCollaborationsOptimized} from "../../../api";
import SpinnerField from "../spinner-field/SpinnerField";
import {chipType, isUserAllowed, ROLES} from "../../../utils/UserRole";
import Logo from "../logo/Logo";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import ConfirmationDialog from "../../confirmation-dialog/ConfirmationDialog";
import {clearFlash} from "../../../utils/Flash";
import Select from "react-select";
import {displayExpiryDate, displayLastActivityDate} from "../../../utils/Date";
import moment from "moment";
import {useQueryParameter} from "../../../hooks/useQueryParameter";

const allValue = "all";

export const Collaborations = ({collaborations: collaborationsProp, user, organisation, history, ...rest}) => {

    const [labelFilterValue, setLabelFilterValue] = useQueryParameter('label');
    const [unitFilterValue, setUnitFilterValue] = useQueryParameter('unit');

    const [standalone, setStandalone] = useState(false);
    const [collaborations, setCollaborations] = useState([]);
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState({});
    const [unitFilterOptions, setUnitFilterOptions] = useState([]);
    const [selectedUnitFilter, setSelectedUnitFilter] = useState({});
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationTxt] = useState(I18n.t("confirmationDialog.confirm"));
    const [confirmationDialogAction] = useState(() => () => true);
    const [confirmationQuestion] = useState("");
    const [loading, setLoading] = useState(true);

    const cancelDialogAction = () => setConfirmationDialogOpen(false);

    const addRoleInformation = (currentUser, colls) => {
        colls.forEach(co => {
            const membership = (currentUser.collaboration_memberships || []).find(m => m.collaboration_id === co.id);
            co.role = membership ? membership.role : null;
        });
    };

    const addLabelInformation = colls => {
        colls.forEach(co => co.tagValues = co.tags
            .sort((t1, t2) => t1.tag_value.localeCompare(t2.tag_value))
            .join(""));
    };

    const allLabelFilterOptions = (colls) => {
        const baseOptions = [{
            label: I18n.t("models.collaborations.allLabels", {nbr: colls.length}),
            value: allValue
        }];
        const tagOptions = colls.reduce((acc, coll) => {
            coll.tags.forEach(tag => {
                const option = acc.find(opt => opt.val === tag.tag_value);
                if (option) {
                    ++option.nbr;
                } else {
                    acc.push({val: tag.tag_value, nbr: 1})
                }
            })
            return acc;
        }, []).map(option => ({
            label: `${option.val} (${option.nbr})`,
            value: option.val
        })).sort((o1, o2) => o1.label.localeCompare(o2.label));

        return baseOptions.concat(tagOptions);
    };

    const allUnitFilterOptions = (colls, org) => {
        const baseOptions = [{
            label: I18n.t("units.filter", {nbr: colls.length}),
            value: allValue
        }];
        let unitOptions;
        if (org) {
            unitOptions = org.units
                .map(unit => ({
                    val: unit.name,
                    nbr: colls.filter(coll => coll.units.some(u => u.name === unit.name)).length
                }));
        } else {
            unitOptions = colls.reduce((acc, coll) => {
                coll.units.forEach(unit => {
                    const option = acc.find(opt => opt.val === unit.name);
                    if (option) {
                        ++option.nbr;
                    } else {
                        acc.push({id: unit.name, val: unit.name, nbr: 1})
                    }
                })
                return acc;
            }, []);
        }
        unitOptions = unitOptions.map(option => ({
            label: `${option.val} (${option.nbr})`,
            value: option.val
        })).sort((o1, o2) => o1.label.localeCompare(o2.label));
        return baseOptions.concat(unitOptions);
    };

    const initializeFilters = useCallback(() => {
        if (collaborationsProp === undefined) {
            (user.admin ? allCollaborationsOptimized() : myCollaborationsOptimized())
                .then(res => {
                    const allFilterOpts = allLabelFilterOptions(res);
                    const allUnitFilterOpts = allUnitFilterOptions(res);
                    addRoleInformation(user, res);
                    setStandalone(true);
                    setCollaborations(res);
                    setFilterOptions(allFilterOpts);
                    setFilterValue(allFilterOpts.find(o => o.value === labelFilterValue) || allFilterOpts[0]);
                    setUnitFilterOptions(allUnitFilterOpts);
                    setSelectedUnitFilter(allUnitFilterOpts.find(o => o.value === unitFilterValue) || allUnitFilterOpts[0]);
                    setLoading(false);
                });
        } else {
            const allFilterOpts = allLabelFilterOptions(collaborationsProp);
            const allUnitFilterOpts = allUnitFilterOptions(collaborationsProp, organisation);
            addRoleInformation(user, collaborationsProp);
            addLabelInformation(collaborationsProp);
            setFilterOptions(allFilterOpts);
            setFilterValue(allFilterOpts.find(o => o.value === labelFilterValue) || allFilterOpts[0]);
            setUnitFilterOptions(allUnitFilterOpts);
            setSelectedUnitFilter(allUnitFilterOpts.find(o => o.value === unitFilterValue) || allUnitFilterOpts[0]);
            setLoading(false);
        }
    }, [collaborationsProp, user, organisation]);

    useEffect(() => {
        initializeFilters();
    }, [initializeFilters]);

    const openCollaboration = collaboration => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        history.push(`/collaborations/${collaboration.id}`);
    };

    const noCollaborations = (org, newLabel, newPath, mayCreateCollaborations) => {
        const info = I18n.t(`models.collaborations.noCollaborations${mayCreateCollaborations ? "" : "Request"}`)
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <p>{info}</p>
                <Button txt={newLabel}
                        onClick={() => history.push(newPath)}/>
            </div>
        );
    };

    const renderFilters = () => {
        return (
            <div className={"collaboration-label-filter-container"}>
                {(!organisation || unitFilterOptions.length > 1) &&
                    <div className="collaboration-label-filter">
                        <Select
                            className={"collaboration-label-filter-select"}
                            value={selectedUnitFilter}
                            classNamePrefix={"filter-select"}
                            onChange={option => {
                                setUnitFilterValue(option.value);
                                setSelectedUnitFilter(option);
                            }}
                            options={unitFilterOptions}
                            isSearchable={false}
                            isClearable={false}
                        />
                    </div>}
                {(!organisation || filterOptions.length > 1) && <div className="collaboration-label-filter">
                    <Select
                        className={"collaboration-label-filter-select"}
                        value={filterValue}
                        classNamePrefix={"filter-select"}
                        onChange={option => {
                            setLabelFilterValue(option.value);
                            setFilterValue(option);
                        }}
                        options={filterOptions}
                        isSearchable={false}
                        isClearable={false}
                    />
                </div>}
            </div>
        );
    };

    if (loading) {
        return <SpinnerField/>;
    }

    const activeCollaborations = standalone ? collaborations : collaborationsProp;

    const isOrgManager = isUserAllowed(ROLES.ORG_MANAGER, user);
    const organisationsFromUserSchacHome = user.organisations_from_user_schac_home || [];
    const createFromSchacHome = organisationsFromUserSchacHome
        .some(org => org.collaboration_creation_allowed || org.collaboration_creation_allowed_entitlement)
    const mayCreateCollaborations = isOrgManager || createFromSchacHome;
    const mayRequestCollaboration = !isEmpty(organisationsFromUserSchacHome);
    const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";
    const newLabel = I18n.t(`models.${mayCreateCollaborations ? "collaborations" : "memberCollaborations"}.new`);

    if (isEmpty(activeCollaborations) && !loading) {
        return noCollaborations(organisation, newLabel, `/new-collaboration${organisationQueryParam}`, mayCreateCollaborations);
    }

    const columns = [];
    const displayUnitColumn = !organisation || unitFilterOptions.length > 1;
    const displayLabelColumn = !organisation || filterOptions.length > 1;
    columns.push(
        {
            nonSortable: true,
            key: "logo",
            header: "",
            mapper: collaboration => <Logo src={collaboration.logo}/>
        },
        {
            key: "name",
            class: `${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
            header: I18n.t("models.collaborations.name"),
            mapper: collaboration => <a href={`/collaborations/${collaboration.id}`}
                                        className={"neutral-appearance"}
                                        onClick={openCollaboration(collaboration)}>{collaboration.name}</a>
        },
        displayUnitColumn ? {
            key: "units",
            class: "units",
            header: I18n.t("units.column"),
            customSort: unitArraySort,
            mapper: collaboration => <div className="unit-container">
                {collaboration.units
                    .sort((u1, u2) => u1.name.localeCompare(u2.name))
                    .map((unit, index) => <span key={index} className="chip-container">
                    {unit.name}</span>)}
            </div>
        } : null,
        displayLabelColumn ? {
            key: organisation ? "tagValues" : "organisation__name",
            class: "",
            header: organisation ? I18n.t("collaboration.tags") : I18n.t("models.serviceCollaborations.organisationName"),
            customSort: tagArraySort,
            mapper: collaboration => organisation ? collaboration.tags
                .sort((t1, t2) => t1.tag_value.localeCompare(t2.tag_value))
                .map((tag, index) => <span key={index}
                                           className={"collaboration_tag"}>{tag.tag_value}</span>) : collaboration.organisation.name
        } : null,
        {
            key: "role",
            class: "",
            header: I18n.t("profile.yourRole"),
            mapper: collaboration => {
                if (collaboration.role) {
                    return <Chip label={I18n.t(`profile.${collaboration.role}`)}
                                 type={chipType(collaboration)}/>
                }
                return null;
            }
        },
        {
            key: "expiry_date",
            class: `expiry_date ${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
            header: I18n.t("collaboration.expiryDate"),
            mapper: collaboration => {
                if (collaboration.expiry_date) {
                    const today = new Date().getTime();
                    const expiryDate = collaboration.expiry_date * 1000;
                    const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
                    const warning = days < 60;
                    let children;
                    if (collaboration.status === "expired" || warning) {
                        children = <Chip
                            label={displayExpiryDate(collaboration.expiry_date)}
                            type={collaboration.status === "expired" ? ChipType.Main_500 : ChipType.Main_300}/>
                    } else {
                        children = <span className={`expiry-date`}>
                                {displayExpiryDate(collaboration.expiry_date)}
                            </span>
                    }
                    return <div>
                        <Tooltip standalone={true}
                                 children={children}
                                 tip={moment(expiryDate).format("LL")}>
                        </Tooltip>
                    </div>;
                }
                return I18n.t("expirations.never");
            }
        },
        {
            key: "last_activity_date",
            class: `last_activity_date ${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
            header: I18n.t("collaboration.lastActivityDate"),
            mapper: collaboration => {
                const today = new Date().getTime();
                const lastActivityDate = collaboration.last_activity_date * 1000;
                const days = Math.round((today - lastActivityDate) / (1000 * 60 * 60 * 24));
                const warning = days > 275;
                return (
                    <Tooltip tip={moment(lastActivityDate).format("LLLL")}
                             children={
                                 collaboration.status === "suspended" ? <div>
                                     <Chip label={I18n.t("collaboration.lastActivitySuspended")}
                                           type={ChipType.Status_error}/>
                                 </div> : <span className={`${warning ? "warning" : ""}`}>
                                         {displayLastActivityDate(collaboration.last_activity_date)}
                                     </span>
                             }
                             standalone={true}/>

                );
            }
        }, {
            key: "collaboration_memberships_count",
            header: I18n.t("models.collaborations.memberCount")
        }
    );
    let filteredCollaborations = filterValue.value === allValue ? activeCollaborations :
        activeCollaborations.filter(coll => coll.tags.some(tag => tag.tag_value === filterValue.value));
    filteredCollaborations = selectedUnitFilter.value === allValue ? filteredCollaborations :
        filteredCollaborations.filter(coll => coll.units.some(unit => unit.name === selectedUnitFilter.value));

    return (
        <>
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelDialogAction}
                                confirm={confirmationDialogAction}
                                isWarning={true}
                                confirmationTxt={confirmationTxt}
                                question={confirmationQuestion}/>
            <Entities entities={filteredCollaborations}
                      modelName={mayCreateCollaborations ? "collaborations" : mayRequestCollaboration ? "memberCollaborations" : "collaborations"}
                      searchAttributes={["name", "identifier", "short_name"]}
                      defaultSort="name"
                      inputFocus={true}
                      title={`${I18n.t("home.tabs.collaborations")} (${activeCollaborations.length})`}
                      rowLinkMapper={() => openCollaboration}
                      columns={columns.filter(col => !isEmpty(col))}
                      onHover={true}
                      newLabel={newLabel}
                      filters={renderFilters()}
                      actionHeader={"collaboration-services"}
                      showNew={mayCreateCollaborations || mayRequestCollaboration}
                      newEntityPath={`/new-collaboration${organisationQueryParam}`}
                      loading={loading}
                      {...rest}/>
        </>);
};
