import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent, tagArraySort, unitArraySort} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Button from "../Button";
import {allCollaborationsOptimized, collaborationAdmins, myCollaborationsOptimized} from "../../api";
import SpinnerField from "./SpinnerField";
import {chipType, isUserAllowed, ROLES} from "../../utils/UserRole";
import Logo from "./Logo";
import CheckBox from "../CheckBox";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import ConfirmationDialog from "../ConfirmationDialog";

import {ReactComponent as InformationCircle} from "@surfnet/sds/icons/functional-icons/info.svg";
import {clearFlash} from "../../utils/Flash";
import Select from "react-select";
import {displayExpiryDate, displayLastActivityDate} from "../../utils/Date";
import moment from "moment";

const allValue = "all";

export default class Collaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            standalone: false,
            collaborations: [],
            selectedCollaborations: {},
            filterOptions: [],
            filterValue: {},
            unitFilterOptions: [],
            unitFilterValue: {},
            collaborationAdminEmails: {},
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaborations, user, service, organisation} = this.props;
        const promises = [collaborationAdmins(service)];
        if (collaborations === undefined) {
            Promise.all(promises.concat([user.admin ? allCollaborationsOptimized() : myCollaborationsOptimized()])).then(res => {
                const allFilterOptions = this.allLabelFilterOptions(res[1]);
                const allUnitFilterOptions = this.allUnitFilterOptions(res[1]);
                this.addRoleInformation(user, res[1]);
                this.setState({
                    standalone: true,
                    collaborationAdminEmails: res[0],
                    collaborations: res[1],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    unitFilterOptions: allUnitFilterOptions,
                    unitFilterValue: allUnitFilterOptions[0],
                    loading: false
                });

            })
        } else {
            const allFilterOptions = this.allLabelFilterOptions(collaborations);
            const allUnitFilterOptions = this.allUnitFilterOptions(collaborations, organisation);
            this.addRoleInformation(user, collaborations);
            this.addLabelInformation(collaborations);
            Promise.all(promises).then(res => {
                this.setState({
                    collaborationAdminEmails: res[0],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    unitFilterOptions: allUnitFilterOptions,
                    unitFilterValue: allUnitFilterOptions[0],
                    loading: false
                })
            })
        }
    }

    addRoleInformation = (user, collaborations) => {
        collaborations.forEach(co => {
            const membership = (user.collaboration_memberships || []).find(m => m.collaboration_id === co.id);
            co.role = membership ? membership.role : null;
        });
    }

    addLabelInformation = collaborations => {
        collaborations.forEach(co => co.tagValues = co.tags
            .sort((t1, t2) => t1.tag_value.localeCompare(t2.tag_value))
            .join(""));
    }

    allLabelFilterOptions = (collaborations) => {
        const filterOptions = [{
            label: I18n.t("models.collaborations.allLabels", {nbr: collaborations.length}),
            value: allValue
        }];
        const tagOptions = collaborations.reduce((acc, coll) => {
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

        return filterOptions.concat(tagOptions);
    }

    allUnitFilterOptions = (collaborations, organisation) => {
        const unitFilterOptions = [{
            label: I18n.t("units.filter", {nbr: collaborations.length}),
            value: allValue
        }];
        let unitOptions;
        if (organisation) {
            unitOptions = organisation.units
                .map(unit => ({
                    val: unit.name, nbr: collaborations
                        .filter(coll => coll.units.some(u => u.name === unit.name)).length
                }));

        } else {
            unitOptions = collaborations.reduce((acc, coll) => {
                coll.units.forEach(unit => {
                    const option = acc.find(opt => opt.name === unit.name);
                    if (option) {
                        ++option.nbr;
                    } else {
                        acc.push({id: unit.name, val: unit.name, nbr: 1})
                    }
                })
                return acc;
            }, [])
        }
        unitOptions = unitOptions.map(option => ({
            label: `${option.val} (${option.nbr})`,
            value: option.val
        })).sort((o1, o2) => o1.label.localeCompare(o2.label));
        return unitFilterOptions.concat(unitOptions);
    }

    noCollaborations = (organisation, newLabel, newPath, mayCreateCollaborations) => {
        const info = I18n.t(`models.collaborations.noCollaborations${mayCreateCollaborations ? "" : "Request"}`)
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <p>{info}</p>
                <Button txt={newLabel}
                        onClick={() => {
                            this.props.history.push(newPath)
                        }}/>

            </div>
        )
    }

    onCheck = collaboration => e => {
        const {selectedCollaborations} = this.state;
        selectedCollaborations[collaboration.id] = e.target.checked;
        this.setState({selectedCollaborations: {...selectedCollaborations}});
    }

    openCollaboration = collaboration => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    filters = (organisation, filterOptions, filterValue, unitFilterOptions, unitFilterValue) => {
        return (
            <div className={"collaboration-label-filter-container"}>
                {(!organisation || unitFilterOptions.length > 1) &&
                    <div className="collaboration-label-filter">
                        <Select
                            className={"collaboration-label-filter-select"}
                            value={unitFilterValue}
                            classNamePrefix={"filter-select"}
                            onChange={option => this.setState({unitFilterValue: option})}
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
                        onChange={option => this.setState({filterValue: option})}
                        options={filterOptions}
                        isSearchable={false}
                        isClearable={false}
                    />
                </div>}
            </div>
        );
    }

    render() {
        const {
            loading,
            standalone,
            selectedCollaborations,
            filterOptions,
            filterValue,
            unitFilterOptions,
            unitFilterValue,
            collaborationAdminEmails,
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationQuestion,
            confirmationTxt
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {collaborations} = standalone ? this.state : this.props;
        const {modelName = "collaborations", organisation} = this.props;

        const {user} = this.props;
        const isOrgManager = isUserAllowed(ROLES.ORG_MANAGER, user);
        const organisationsFromUserSchacHome = user.organisations_from_user_schac_home || [];
        const createFromSchacHome = organisationsFromUserSchacHome
            .some(org => org.collaboration_creation_allowed || org.collaboration_creation_allowed_entitlement)
        const mayCreateCollaborations = isOrgManager || createFromSchacHome;
        const mayRequestCollaboration = !isEmpty(organisationsFromUserSchacHome);
        const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";
        const newLabel = I18n.t(`models.${mayCreateCollaborations ? "collaborations" : "memberCollaborations"}.new`);

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations(organisation, newLabel, `/new-collaboration${organisationQueryParam}`, mayCreateCollaborations);
        }

        const columns = [];
        const serviceModule = modelName === "serviceCollaborations";
        const serviceKey = serviceModule ? " services" : "";
        if (serviceModule) {
            let i = 0;
            columns.push({
                nonSortable: true,
                key: "check",
                header: <CheckBox value={false}
                                  name={"allSelected"}
                                  hide={true}
                                  onChange={() => false}/>,

                mapper: entity => {
                    if (entity.fromCollaboration) {
                        return (
                            <div className="check">
                                <CheckBox name={"" + ++i}
                                          onChange={this.onCheck(entity)}
                                          value={(selectedCollaborations[entity.id]) || false}/>
                            </div>)
                    } else {
                        return (
                            <Tooltip standalone={true} children={<InformationCircle/>}
                                     tip={I18n.t("models.serviceCollaborations.organisationWarningTooltip")}/>
                        )
                    }
                }
            });
        }
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
                class: `${serviceKey} ${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <a href={`/collaborations/${collaboration.id}`}
                                            className={"neutral-appearance"}
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>
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
                class: serviceKey,
                header: organisation ? I18n.t("collaboration.tags") : I18n.t("models.serviceCollaborations.organisationName"),
                customSort: tagArraySort,
                mapper: collaboration => organisation ? collaboration.tags
                    .sort((t1, t2) => t1.tag_value.localeCompare(t2.tag_value))
                    .map((tag, index) => <span key={index}
                                               className={"collaboration_tag"}>{tag.tag_value}</span>) : collaboration.organisation.name
            } : null,
            {
                key: "role",
                class: serviceKey,
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
                class: `expiry_date ${serviceKey} ${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
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
                class: `last_activity_date ${serviceKey} ${displayLabelColumn ? "" : "no-labels"} ${displayUnitColumn ? "" : "no-units"}`,
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
        let filteredCollaborations = filterValue.value === allValue ? collaborations :
            collaborations.filter(coll => coll.tags.some(tag => tag.tag_value === filterValue.value));
        filteredCollaborations = unitFilterValue.value === allValue ? filteredCollaborations :
            filteredCollaborations.filter(coll => coll.units.some(unit => unit.name === unitFilterValue.value));
        return (
            <>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>
                <Entities entities={filteredCollaborations}
                          modelName={mayCreateCollaborations ? modelName : mayRequestCollaboration ? "memberCollaborations" : modelName}
                          searchAttributes={["name", "identifier", "short_name"]}
                          defaultSort="name"
                          inputFocus={true}
                          title={`${I18n.t("home.tabs.collaborations")} (${collaborations.length})`}
                          rowLinkMapper={() => this.openCollaboration}
                          columns={columns.filter(col => !isEmpty(col))}
                          onHover={true}
                          newLabel={newLabel}
                          filters={this.filters(organisation, filterOptions, filterValue, unitFilterOptions, unitFilterValue)}
                          actionHeader={"collaboration-services"}
                          actions={serviceModule ? this.actionButtons(selectedCollaborations, collaborationAdminEmails, collaborations) : null}
                          showNew={mayCreateCollaborations || mayRequestCollaboration}
                          newEntityPath={`/new-collaboration${organisationQueryParam}`}
                          loading={loading}
                          {...this.props}/>
            </>)
    }

}
