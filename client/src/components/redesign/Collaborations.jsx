import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {allCollaborations, deleteCollaborationServices, mayRequestCollaboration, myCollaborations} from "../../api";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import Logo from "./Logo";
import moment from "moment";
import CheckBox from "../CheckBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ReactTooltip from "react-tooltip";
import ConfirmationDialog from "../ConfirmationDialog";
import Tooltip from "./Tooltip";
import {ReactComponent as InformationCircle} from "../../icons/information-circle.svg";
import {setFlash} from "../../utils/Flash";
import Select from "react-select";
import DOMPurify from "dompurify";

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
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaborations, showTagFilter = false, platformAdmin = false} = this.props;
        const promises = [mayRequestCollaboration()];
        if (collaborations === undefined) {
            Promise.all(promises.concat([platformAdmin ? allCollaborations() : myCollaborations()])).then(res => {
                const allFilterOptions = this.allLabelFilterOptions(res[1], showTagFilter);
                this.setState({
                    standalone: true,
                    collaborations: res[1],
                    showRequestCollaboration: res[0],
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    loading: false
                });

            })
        } else {
            const allFilterOptions = this.allLabelFilterOptions(collaborations, showTagFilter);
            Promise.all(promises).then(res => {
                this.setState({
                    showRequestCollaboration: res,
                    filterOptions: allFilterOptions,
                    filterValue: allFilterOptions[0],
                    loading: false
                })
            })
        }

    }

    allLabelFilterOptions = (collaborations, showTagFilter) => {
        if (!showTagFilter) {
            return [{}];
        }
        const filterOptions = [{
            label: I18n.t("collaborationRequest.statuses.all", {nbr: collaborations.length}),
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

    removeCollaboration = (showConfirmation, entityId) => {
        const {collaborations, service} = this.props;
        const name = (collaborations.find(coll => coll.id === entityId) || {}).name;
        if (showConfirmation) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationQuestion: I18n.t(`models.serviceCollaborations.confirmation.remove${entityId ? "One" : ""}`,
                    {name: name}),
                confirmationDialogAction: () => this.removeCollaboration(false, entityId),
            });
        } else {
            const {selectedCollaborations} = this.state;
            const collaborationIdentifiers = entityId ? [entityId] : Object.entries(selectedCollaborations)
                .filter(l => l[1])
                .map(e => parseInt(e[0], 10));
            const promises = collaborationIdentifiers.map(id => deleteCollaborationServices(id, service.id));
            Promise.all(promises).then(() => this.props.refresh(() => {
                this.componentDidMount();
                setFlash(I18n.t("models.serviceCollaborations.flash.removed"));
            }));

        }
    }

    actionButtons = selectedCollaborations => {
        const selected = Object.values(selectedCollaborations).filter(v => v);
        const anySelected = selected.length > 0;
        if (!anySelected) {
            return null;
        }
        return (
            <div className="admin-actions">
                <div data-tip data-for="remove-collaborations">
                    <Button onClick={() => this.removeCollaboration(true)}
                            txt={I18n.t("models.serviceCollaborations.disconnect")}
                            icon={<FontAwesomeIcon icon="trash"/>}/>
                    <ReactTooltip id="remove-collaborations" type="light" effect="solid" data-html={true}
                                  place="bottom">
                    <span
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.serviceCollaborations.disconnectTooltip"))}}/>
                    </ReactTooltip>
                </div>
            </div>);
    }

    getActionIcons = entity => {
        if (!entity.fromCollaboration) {
            return null;
        }
        return (
            <div className={"action-icons-container"}>
                <div className="admin-icons">
                    <div data-tip data-for={`delete-org-member-${entity.id}`}
                         onClick={() => this.removeCollaboration(true, entity.id)}>
                        <FontAwesomeIcon icon="trash"/>
                        <ReactTooltip id={`delete-org-member-${entity.id}`} type="light" effect="solid" data-html={true}
                                      place="bottom">
                            <span
                                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("models.serviceCollaborations.disconnectOneTooltip"))}}/>
                        </ReactTooltip>
                    </div>
                </div>
            </div>
        );
    }

    openCollaboration = collaboration => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    filters = (filterOptions, filterValue, showTagFilter) => {
        if (!showTagFilter) {
            return null;
        }
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
        const {showTagFilter} = this.props;
        const {
            loading,
            standalone,
            showRequestCollaboration,
            selectedCollaborations,
            filterOptions,
            filterValue,
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
        const {
            modelName = "collaborations", organisation, mayCreate = true, showOrigin = false,
            showExpiryDate = false, showLastActivityDate = false, userAdmin = false, userServiceAdmin = false
        } = this.props;

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
                            <Tooltip children={<InformationCircle/>} id={"collaboration-warning" + ++i}
                                     msg={I18n.t("models.serviceCollaborations.organisationWarningTooltip")}/>
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
                mapper: collaboration => !userAdmin ? <span>{collaboration.name}</span> :
                    <a href={`/collaborations/${collaboration.id}`}
                       onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>,
            },
            {
                key: "organisation__name",
                class: serviceKey,
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? organisation.name : collaboration.organisation.name
            },
            {
                nonSortable: true,
                key: "role",
                class: serviceKey,
                header: "",// I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    const cm = user.collaboration_memberships.find(m => m.collaboration_id === collaboration.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
            }
        );
        if (serviceModule) {
            columns.push({
                key: "short_name",
                header: I18n.t("organisation.shortName"),
                mapper: collaboration =>
                    <span>{`${collaboration.organisation.short_name}:${collaboration.short_name}`}</span>,
            });
        }
        if (showExpiryDate) {
            columns.push({
                key: "expiry_date",
                header: I18n.t("collaboration.expiryDate"),
                mapper: collaboration => {
                    if (collaboration.expiry_date) {
                        const today = new Date().getTime();
                        const expiryDate = collaboration.expiry_date * 1000;
                        const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
                        const warning = days < 60;
                        return <div>
                            <span className={warning ? "warning" : ""}>{moment(expiryDate).format("LL")}</span>
                            {(warning && collaboration.status === "active") &&
                            <span className="warning">
                            {I18n.p(days, "collaboration.expiryDateWarning", {nbr: days})}
                            </span>}
                            {(collaboration.status === "expired") &&
                            <span className="warning">{I18n.t("collaboration.expiryDateExpired", {nbr: days})}</span>}
                        </div>;
                    }
                    return I18n.t("service.none");
                }
            });
        }
        if (showLastActivityDate) {
            columns.push({
                key: "last_activity_date",
                header: I18n.t("collaboration.lastActivityDate"),
                mapper: collaboration => {
                    const today = new Date().getTime();
                    const lastActivityDate = collaboration.last_activity_date * 1000;
                    const days = Math.round((today - lastActivityDate) / (1000 * 60 * 60 * 24));
                    const warning = days > 60;
                    return <div>
                        <span className={warning ? "warning" : ""}>{moment(lastActivityDate).format("L")}</span>
                        {collaboration.status === "suspended" && <span className="warning">
                            {I18n.t("collaboration.lastActivitySuspended")}
                        </span>}
                    </div>;
                }
            });
        }
        if (showOrigin) {
            columns.push({
                key: "fromCollaboration",
                header: I18n.t("models.serviceCollaborations.origin"),
                mapper: collaboration => collaboration.fromCollaboration ?
                    I18n.t("models.serviceCollaborations.fromCollaboration") : I18n.t("models.serviceCollaborations.fromOrganisation")
            });
        }
        if (serviceModule) {
            columns.push({
                    nonSortable: true,
                    key: "action-icons",
                    header: "",
                    mapper: entity => this.getActionIcons(entity)
                },
            )
        }
        const allColumns = serviceModule ? columns : columns.concat([{
            key: "collaboration_memberships_count",
            header: I18n.t("models.collaborations.memberCount")
        },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }]);

        const filteredCollaborations = (filterValue.value === allValue || !showTagFilter) ? collaborations :
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
                          rowLinkMapper={userServiceAdmin ? null : () => this.openCollaboration}
                          columns={allColumns}
                          onHover={true}
                          filters={this.filters(filterOptions, filterValue, showTagFilter)}
                          actionHeader={"collaboration-services"}
                          actions={serviceModule ? this.actionButtons(selectedCollaborations) : null}
                          showNew={(mayCreateCollaborations || showRequestCollaboration) && mayCreate}
                          newEntityPath={`/new-collaboration${organisationQueryParam}`}
                          loading={loading}
                          {...this.props}/>
            </>)
    }

}

