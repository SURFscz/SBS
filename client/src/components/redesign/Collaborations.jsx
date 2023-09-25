import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import Button from "../Button";
import {allCollaborations, collaborationAdmins, myCollaborations} from "../../api";
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
        const {collaborations, user, service} = this.props;
        const promises = [collaborationAdmins(service)];
        if (collaborations === undefined) {
            Promise.all(promises.concat([user.admin ? allCollaborations() : myCollaborations()])).then(res => {
                const allFilterOptions = this.allLabelFilterOptions(res[1]);
                this.addRoleInformation(user, res[1]);
                this.setState({
                    standalone: true,
                    collaborationAdminEmails: res[0],
                    collaborations: res[1],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    loading: false
                });

            })
        } else {
            const allFilterOptions = this.allLabelFilterOptions(collaborations);
            this.addRoleInformation(user, collaborations);
            this.addLabelInformation(collaborations);
            Promise.all(promises).then(res => {
                this.setState({
                    collaborationAdminEmails: res[0],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
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

    filters = (filterOptions, filterValue) => {
        return (
            <div className="collaboration-label-filter">
                <Select
                    className={"collaboration-label-filter-select"}
                    value={filterValue}
                    classNamePrefix={"filter-select"}
                    onChange={option => this.setState({filterValue: option})}
                    options={filterOptions}
                    isSearchable={false}
                    isClearable={false}
                />
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
        const organisationFromUserSchacHome = user.organisation_from_user_schac_home || {};
        const mayCreateCollaborations = isOrgManager || organisationFromUserSchacHome.collaboration_creation_allowed ||
            organisationFromUserSchacHome.collaboration_creation_allowed_entitlement
        const mayRequestCollaboration = !isEmpty(organisationFromUserSchacHome);
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
                                     anchorId={"collaboration-warning" + ++i}
                                     tip={I18n.t("models.serviceCollaborations.organisationWarningTooltip")}/>
                        )
                    }
                }
            });
        }
        columns.push(
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: collaboration => <Logo src={collaboration.logo}/>
            },
            {
                key: "name",
                class: serviceKey,
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <a href={`/collaborations/${collaboration.id}`}
                                            className={"neutral-appearance"}
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>
            },
            {
                key: organisation ? "tagValues" : "organisation__name",
                class: serviceKey,
                header: organisation ? I18n.t("collaboration.tags") : I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? collaboration.tags
                    .sort((t1, t2) => t1.tag_value.localeCompare(t2.tag_value))
                    .map(tag => <span
                        className={"collaboration_tag"}>{tag.tag_value}</span>) : collaboration.organisation.name
            },
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
                                     anchorId={`${collaboration.id}-expiry_date`}
                                     tip={moment(expiryDate).format("LL")}>
                            </Tooltip>
                        </div>;
                    }
                    return I18n.t("expirations.never");
                }
            },
            {
                key: "last_activity_date",
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
                                 standalone={true}
                                 anchorId={`${collaboration.id}-last_activity_date`}/>

                    );
                }
            }, {
                key: "collaboration_memberships_count",
                header: I18n.t("models.collaborations.memberCount")
            },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }
        );
        const filteredCollaborations = (filterValue.value === allValue) ? collaborations :
            collaborations.filter(coll => coll.tags.some(tag => tag.tag_value === filterValue.value));
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
                          searchAttributes={["name"]}
                          defaultSort="name"
                          inputFocus={true}
                          title={`${I18n.t("home.tabs.collaborations")} (${collaborations.length})`}
                          rowLinkMapper={() => this.openCollaboration}
                          columns={columns}
                          onHover={true}
                          newLabel={newLabel}
                          filters={this.filters(filterOptions, filterValue)}
                          actionHeader={"collaboration-services"}
                          actions={serviceModule ? this.actionButtons(selectedCollaborations, collaborationAdminEmails, collaborations) : null}
                          showNew={mayCreateCollaborations || mayRequestCollaboration}
                          newEntityPath={`/new-collaboration${organisationQueryParam}`}
                          loading={loading}
                          {...this.props}/>
            </>)
    }

}

