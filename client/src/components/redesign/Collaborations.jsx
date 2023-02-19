import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {allCollaborations, collaborationAdmins, mayRequestCollaboration, myCollaborations} from "../../api";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import Logo from "./Logo";
import CheckBox from "../CheckBox";
import {Tooltip} from "@surfnet/sds";
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
            showRequestCollaboration: false,
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
        const promises = [mayRequestCollaboration(), collaborationAdmins(service)];
        if (collaborations === undefined) {
            Promise.all(promises.concat([user.admin ? allCollaborations() : myCollaborations()])).then(res => {
                const allFilterOptions = this.allLabelFilterOptions(res[2]);
                this.addRoleInformation(user, res[2]);
                this.setState({
                    standalone: true,
                    showRequestCollaboration: res[0],
                    collaborationAdminEmails: res[1],
                    collaborations: res[2],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    loading: false
                });

            })
        } else {
            const allFilterOptions = this.allLabelFilterOptions(collaborations);
            this.addRoleInformation(user, collaborations);
            Promise.all(promises).then(res => {
                this.setState({
                    showRequestCollaboration: res[0],
                    collaborationAdminEmails: res[1],
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

    noCollaborations = organisation => {
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <h2>{I18n.t("models.collaborations.noCollaborations")}</h2>
                <Button txt={I18n.t("models.collaborations.new")}
                        onClick={() => {
                            const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";
                            this.props.history.push(`/new-collaboration${organisationQueryParam}`)
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
            showRequestCollaboration,
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

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations(organisation);
        }
        const {user} = this.props;
        const mayCreateCollaborations = isUserAllowed(ROLES.ORG_MANAGER, user);
        const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";

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
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>
            },
            {
                key: "organisation__name",
                class: serviceKey,
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? organisation.name : collaboration.organisation.name
            },
            {
                key: "role",
                class: serviceKey,
                header: I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    if (collaboration.role) {
                        return <span
                            className={`person-role ${collaboration.role}`}>{I18n.t(`profile.${collaboration.role}`)}</span>
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
                        const className = collaboration.status === "expired" ? "expired" : warning ? "warning" : "";
                        return <div>
                            <Tooltip standalone={true} children={<span className={`expiry-date ${className}`}>
                                    {displayExpiryDate(collaboration.expiry_date)}
                                </span>}
                                     anchorId={`${collaboration.id}-expiry_date`}
                                     tip={moment(expiryDate).format("LLLL")}>
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
                    const warning = days > 60;
                    const className = collaboration.status === "suspended" ? "suspended" : warning ? "warning" : "";
                    return <div>
                        <Tooltip children={<span className={`last-activity-date ${className}`}>
                                    {displayLastActivityDate(collaboration.last_activity_date)}
                                </span>}
                                 standalone={true}
                                 anchorId={`${collaboration.id}-last_activity_date`}
                                 tip={moment(lastActivityDate).format("LLLL")}>
                        </Tooltip>
                        {collaboration.status === "suspended" && <span className="suspended">
                            {I18n.t("collaboration.lastActivitySuspended")}
                        </span>}
                    </div>;
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
                          modelName={mayCreateCollaborations ? modelName : showRequestCollaboration ? "memberCollaborations" : modelName}
                          searchAttributes={["name"]}
                          defaultSort="name"
                          hideTitle={true}
                          rowLinkMapper={() => this.openCollaboration}
                          columns={columns}
                          onHover={true}
                          filters={this.filters(filterOptions, filterValue)}
                          actionHeader={"collaboration-services"}
                          actions={serviceModule ? this.actionButtons(selectedCollaborations, collaborationAdminEmails, collaborations) : null}
                          showNew={true}
                          newEntityPath={`/new-collaboration${organisationQueryParam}`}
                          loading={loading}
                          {...this.props}/>
            </>)
    }

}

