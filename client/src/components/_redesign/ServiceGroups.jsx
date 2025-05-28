import React from "react";
import {
    createServiceGroup,
    deleteServiceGroup,
    serviceGroupNameExists,
    serviceGroupShortNameExists,
    updateServiceGroup
} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import {ReactComponent as ThrashIcon} from "../../icons/trash_new.svg";
import {ReactComponent as PencilIcon} from "@surfnet/sds/icons/functional-icons/edit.svg";
import {ReactComponent as BinIcon} from "@surfnet/sds/icons/functional-icons/bin.svg";
import "./ServiceGroups.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Button from "../button/Button";
import {clearFlash, setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import InputField from "../input-field/InputField";
import CheckBox from "../checkbox/CheckBox";
import moment from "moment";
import {sanitizeShortName} from "../../validations/regExps";
import {AppStore} from "../../stores/AppStore";
import ErrorIndicator from "./ErrorIndicator";
import {isUserServiceAdmin} from "../../utils/UserRole";
import {IconButton, Tooltip} from "@surfnet/sds";
import {CopyToClipboard} from "react-copy-to-clipboard";
import ClipBoardCopy from "./ClipBoardCopy";

class ServiceGroups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            required: ["name", "short_name"],
            alreadyExists: {},
            allSelected: false,
            allGroupsSelected: false,
            selectedGroups: {},
            groupResultAfterSearch: false,
            initial: true,
            createNewGroup: false,
            selectedGroupId: null,
            editGroup: false,
            name: "",
            short_name: "",
            description: "",
            auto_provision_members: false,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
        }
    }

    componentDidMount = callback => {
        const {service} = this.props;
        const selectedGroups = service.service_groups.reduce((acc, entity) => {
            acc[entity.id] = {
                selected: false,
                ref: entity
            };
            return acc;
        }, {});
        this.setState({
            loading: false,
            selectedGroups: selectedGroups,
            allSelected: false,
            resultAfterSearch: false,
            allGroupsSelected: false,
            groupResultAfterSearch: false,
        }, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true, confirmationDialogOpen: false});
        const promises = Array.isArray(promise) ? promise : [promise];
        Promise.all(promises)
            .then(res => {
                this.props.refresh(() => {
                    this.componentDidMount(() => callback && callback(res));
                    setFlash(flashMsg);
                });
            })
            .catch(() => this.setState({loading: false}));
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedGroup = () => {
        const {selectedGroupId} = this.state;
        const {service} = this.props;
        return service.service_groups.find(g => g.id === selectedGroupId);
    }

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    removeFromActionIcon = (entityId, showConfirmation) => {
        const {service} = this.props;
        const group = service.service_groups.find(inv => inv.id === entityId);
        if (showConfirmation) {
            this.confirm(() => this.removeFromActionIcon(entityId, false),
                I18n.t("models.groups.deleteGroupConfirmation", {name: group.name}))
        } else {
            this.setState({confirmationDialogOpen: false, loading: true});
            deleteServiceGroup(group.id).then(() => {
                this.props.refresh(this.componentDidMount);
                setFlash(I18n.t("groups.flash.deleted", {name: group.name}));
            }).catch(() => {
                this.props.refresh(this.componentDidMount);
            });
        }
    }

    getActionIcons = entity => {
        return (
            <div className="admin-icons"
                 onClick={() => this.removeFromActionIcon(entity.id, true)}>
                <Tooltip standalone={true}
                         tip={I18n.t("models.groups.removeGroupTooltip")}
                         children={<ThrashIcon/>}/>
            </div>
        );
    }

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedGroupId: null, createNewGroup: false, editGroup: false});
        AppStore.update(s => {
            const paths = s.breadcrumb.paths.slice(0, s.breadcrumb.paths.length - 1);
            const lastPath = paths[paths.length - 1];
            if (lastPath) {
                lastPath.path = null;
            }
            s.breadcrumb.paths = paths;
        });
    }

    validateServiceGroupName = e => {
        const {createNewGroup} = this.state;
        const {service} = this.props;
        const selectedGroup = this.getSelectedGroup();
        const name = e.target.value.trim();
        serviceGroupNameExists(name, service.id, createNewGroup ? null : selectedGroup.name).then(json => {
            this.setState({name: name, alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateServiceGroupShortName = e => {
        const {createNewGroup} = this.state;
        const selectedGroup = this.getSelectedGroup();
        const {service} = this.props;
        serviceGroupShortNameExists(sanitizeShortName(e.target.value), service.id, createNewGroup ? null : selectedGroup.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };

    groupSearchCallback = groupResultAfterSearch => {
        this.setState({groupResultAfterSearch: groupResultAfterSearch});
    }

    onGroupCheck = group => e => {
        const {selectedGroups, allGroupsSelected} = this.state;
        const checked = e.target.checked;
        const identifier = group.id;
        selectedGroups[identifier].selected = checked;
        this.setState({selectedGroups: {...selectedGroups}, allGroupsSelected: (checked ? allGroupsSelected : false)});
    }

    allGroupChecksSelected = e => {
        const {selectedGroups, groupResultAfterSearch} = this.state;
        const val = e.target.checked;
        let identifiers = Object.keys(selectedGroups);
        if (groupResultAfterSearch !== false) {
            const afterSearchIdentifiers = groupResultAfterSearch.map(entity => entity.id.toString());
            identifiers = identifiers.filter(id => afterSearchIdentifiers.includes(id));
        }
        identifiers.forEach(id => selectedGroups[id].selected = val);
        const newSelectedGroups = {...selectedGroups};
        this.setState({allGroupsSelected: val, selectedGroups: newSelectedGroups});
    }


    renderGroupContainer = children => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        return (
            <div className="service-group-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a className={"back-to-groups"} onClick={this.cancelSideScreen} href={"/#cancel"}>
                        <ChevronLeft/>{I18n.t("models.serviceGroups.backToGroups")}
                    </a>
                </div>
                {children}
            </div>
        );
    }

    removeGroups = showConfirmation => {
        if (showConfirmation) {
            this.confirm(() => this.removeGroups(false), I18n.t("models.groups.deleteGroupsConfirmation"));
        } else {
            const {selectedGroups} = this.state;
            const selectedGroupIdentifiers = Object.values(this.getSelectedGroupsWithFilteredSearch(selectedGroups))
                .filter(val => val.selected)
                .map(val => parseInt(val.ref.id));
            this.refreshAndFlash(
                selectedGroupIdentifiers.map(id => deleteServiceGroup(id)),
                I18n.t("groups.flash.deletedGroups"))

        }
    }

    getSelectedGroupsWithFilteredSearch = selectedGroups => {
        const {groupResultAfterSearch} = this.state;
        if (groupResultAfterSearch !== false) {
            const afterSearchIdentifiers = groupResultAfterSearch.map(entity => entity.id.toString());
            const filteredSelectedGroups = afterSearchIdentifiers.reduce((acc, id) => {
                //The resultAfterSearch may contain deleted groups
                if (selectedGroups[id]) {
                    acc[id] = selectedGroups[id];
                }
                return acc;
            }, {});
            return filteredSelectedGroups;
        }
        return selectedGroups;
    }


    groupActionButtons = selectedGroups => {
        const filteredSelectedGroups = this.getSelectedGroupsWithFilteredSearch(selectedGroups);
        const selected = Object.values(filteredSelectedGroups).filter(v => v.selected);
        if (selected.length === 0) {
            return null;
        }
        return (
            <div className="admin-actions">
                <div>
                    <Tooltip standalone={true}
                             tip={I18n.t("models.groups.removeTooltip")}
                             children={<Button onClick={() => this.removeGroups(true)}
                                               small={true}
                                               txt={I18n.t("models.orgMembers.remove")}
                                               icon={<ThrashIcon/>}/>}/>
                </div>
            </div>
        )
    }

    renderGroupDetails = (selectedGroup, mayCreateGroups) => {
        const queryParam = `name=${encodeURIComponent(I18n.t("breadcrumb.group", {name: selectedGroup.name}))}&back=${encodeURIComponent(window.location.pathname)}`;
        const children = (
            <div className={"service-group-details"}>
                <div className="group-details-header">
                    <section className="header">
                        <h1>{selectedGroup.name}</h1>
                        {mayCreateGroups &&
                            <div className="header-actions">
                                <IconButton onClick={() => this.setState(this.newGroupState(selectedGroup))}>
                                    <Tooltip
                                        tip={I18n.t("models.groups.edit")}
                                        children={<PencilIcon/>}
                                        standalone={true}/>
                                </IconButton>
                                <IconButton onClick={this.delete}>
                                    <Tooltip
                                        tip={I18n.t("groups.delete")}
                                        children={<BinIcon/>}
                                        standalone={true}/>
                                </IconButton>
                            </div>}
                    </section>
                    <p className={`description ${mayCreateGroups ? "" : "no-header-actions"}`}>{selectedGroup.description}</p>
                    <section className="group-meta-data">
                        <div className="meta-data-item">
                            <span className="item-label">
                                {I18n.t("collaboration.shortName")}
                            </span>
                            <span className="contains-copy group-urn">
                                <CopyToClipboard text={selectedGroup.short_name}>
                                    <span className={"copy-link"} onClick={e => {
                                        const me = e.target;
                                        me.classList.add("copied");
                                        setTimeout(() => me.classList.remove("copied"), 750);
                                    }}>
                                {selectedGroup.short_name}
                            </span>
                            </CopyToClipboard>
                            <ClipBoardCopy transparentBackground={true} txt={selectedGroup.short_name}/>
                            </span>
                        </div>
                        <div className="meta-data-item">
                            <span className="item-label">
                                {I18n.t("models.groups.autoProvisioning")}
                            </span>
                            <span>{I18n.t(`models.groups.${selectedGroup.auto_provision_members ? "on" : "off"}`)}</span>
                        </div>
                        <a className="history"
                           onClick={e => {
                               stopEvent(e);
                               clearFlash();
                               this.props.history.push(`/audit-logs/service_groups/${selectedGroup.id}?${queryParam}`)
                           }}>
                            {I18n.t("home.historyLink")}
                        </a>
                    </section>
                </div>
            </div>
        );
        return this.renderGroupContainer(children);

    }

    newGroupState = group => ({
        createNewGroup: group ? false : true,
        selectedGroupId: group ? group.id : null,
        editGroup: group ? true : false,
        name: group ? group.name : "",
        short_name: group ? group.short_name : "",
        auto_provision_members: group ? group.auto_provision_members : false,
        alreadyExists: {},
        initial: true,
        description: group ? group.description : "",
    });

    renderGroupForm = (createNewGroup, selectedGroup) => {
        const {user} = this.props;
        const {
            name, short_name, auto_provision_members, alreadyExists, initial, description
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const children = (
            <div className="service-group-form">
                <h2>{createNewGroup ? I18n.t("models.serviceGroups.new") : selectedGroup.name}</h2>

                <InputField value={name || ""}
                            onChange={e => this.setState({
                                name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            placeholder={I18n.t("groups.namePlaceholder")}
                            onBlur={this.validateServiceGroupName}
                            name={I18n.t("groups.name")}/>
                {alreadyExists.name && <ErrorIndicator msg={I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.name").toLowerCase(),
                    value: name
                })}/>}
                {(!initial && isEmpty(name)) && <ErrorIndicator
                    msg={I18n.t("groups.required", {
                        attribute: I18n.t("groups.name").toLowerCase()
                    })}/>}

                <InputField value={short_name}
                            name={I18n.t("groups.short_name")}
                            placeholder={I18n.t("groups.shortNamePlaceHolder")}
                            onBlur={this.validateServiceGroupShortName}
                            onChange={e => this.setState({
                                short_name: sanitizeShortName(e.target.value),
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            error={alreadyExists.short_name || (!initial && isEmpty(short_name))}
                            toolTip={I18n.t("groups.shortNameTooltip")}
                            disabled={!createNewGroup && !user.admin}/>
                {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.short_name").toLowerCase(),
                    value: short_name
                })}/>}
                {(!initial && isEmpty(short_name)) && <ErrorIndicator msg={I18n.t("groups.required", {
                    attribute: I18n.t("groups.short_name").toLowerCase()
                })}/>}

                <InputField value={description}
                            name={I18n.t("groups.description")}
                            placeholder={I18n.t("groups.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            multiline={true}/>

                <CheckBox name="auto_provision_members" value={auto_provision_members}
                          info={I18n.t("groups.autoProvisionMembers")}
                          tooltip={I18n.t("models.serviceGroups.autoProvisionMembersTooltip")}
                          onChange={e => this.setState({auto_provision_members: e.target.checked})}/>

                {!createNewGroup &&
                    <InputField value={moment(selectedGroup.created_at * 1000).format("LLLL")}
                                disabled={true}
                                name={I18n.t("organisation.created")}/>}

                <section className="actions">
                    {!createNewGroup &&
                        <Button warningButton={true}
                                onClick={this.delete}/>}
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                            onClick={() => this.setState({editGroup: false, createNewGroup: false})}/>
                    <Button disabled={disabledSubmit} txt={I18n.t(`forms.save`)}
                            onClick={this.submit}/>
                </section>

            </div>
        );
        return this.renderGroupContainer(children);
    }

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.cancelSideScreen,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        const selectedGroup = this.getSelectedGroup();
        const action = () => this.refreshAndFlash(deleteServiceGroup(selectedGroup.id),
            I18n.t("groups.flash.deleted", {name: selectedGroup.name}),
            () => this.setState({
                confirmationDialogOpen: false, selectedGroup: null, editGroup: false,
                createNewGroup: false
            }));
        this.confirm(action, I18n.t("groups.deleteConfirmation", {name: selectedGroup.name}));
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {name, createNewGroup} = this.state;
            const {service} = this.props;
            if (createNewGroup) {
                this.refreshAndFlash(createServiceGroup({...this.state, service_id: service.id}),
                    I18n.t("groups.flash.created", {name: name}),
                    res => {
                        this.gotoGroup({id: res[0].id, name: name})();
                    });
            } else {
                const {selectedGroupId} = this.state;
                this.refreshAndFlash(updateServiceGroup({
                        ...this.state,
                        id: selectedGroupId,
                        service_id: service.id
                    }),
                    I18n.t("groups.flash.updated", {name: name}),
                    () => this.gotoGroup({id: selectedGroupId, name: name})());
            }
        } else {
            window.scrollTo(0, 0);
        }
    }

    newServiceGroup = () => {
        AppStore.update(s => {
            const {service} = this.props;
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = `/services/${service.id}`
            paths.push({value: I18n.t("breadcrumb.newGroup")});
            s.breadcrumb.paths = paths;
        });
        this.setState(this.newGroupState());
    }

    gotoGroup = group => e => {
        stopEvent(e);
        this.setState({
            selectedGroupId: group.id,
            createNewGroup: false,
            editGroup: false
        });
        AppStore.update(s => {
            const {service} = this.props;
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = `/services/${service.id}`
            paths.push({
                value: I18n.t("breadcrumb.group", {name: group.name})
            })
            s.breadcrumb.paths = paths;
        });
    }

    render() {
        const {
            loading, createNewGroup, editGroup, allGroupsSelected, selectedGroups,
            confirmationDialogQuestion, confirmationDialogAction, cancelDialogAction, confirmationDialogOpen
        } = this.state;
        if (loading) {
            return <div className="loader-container"><SpinnerField/></div>;
        }
        const {service, user: currentUser} = this.props;
        const selectedGroup = this.getSelectedGroup();
        const mayCreateGroups = isUserServiceAdmin(currentUser, service) || currentUser.admin;
        if (createNewGroup || (editGroup && selectedGroup)) {
            return this.renderGroupForm(createNewGroup, selectedGroup, mayCreateGroups);
        }
        if (selectedGroup) {
            return this.renderGroupDetails(selectedGroup, mayCreateGroups);
        }
        const groups = service.service_groups;
        const columns = [
            mayCreateGroups ? {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={allGroupsSelected}
                                  name={"allGroupsSelected"}
                                  onChange={this.allGroupChecksSelected}/>,
                mapper: entity => <div className="check">
                    <CheckBox name={`${entity.id}`}
                              onChange={this.onGroupCheck(entity)}
                              value={(selectedGroups[entity.id] || {}).selected || false}/>
                </div>
            } : null,
            {
                key: "name",
                header: I18n.t("models.serviceGroups.name"),
                mapper: group => <a href={`${group.name}`}
                                    className={"neutral-appearance"}
                                    onClick={this.gotoGroup(group)}>{group.name}</a>,
            },
            {
                key: "short_name",
                header: I18n.t("groups.short_name"),
                mapper: group => <a href={`${group.short_name}`}
                                    className={"neutral-appearance"}
                                    onClick={this.gotoGroup(group)}>{group.short_name}</a>,
            },
            {
                key: "description",
                header: I18n.t("models.serviceGroups.description"),
                mapper: group => <span className={"cut-of-lines"}>{group.description}</span>
            },
        ].filter(column => !isEmpty(column));
        if (mayCreateGroups) {
            columns.push({
                key: "auto_provision_members",
                header: I18n.t("models.serviceGroups.autoProvisioning"),
                mapper: group => I18n.t(`models.serviceGroups.${group.auto_provision_members ? "on" : "off"}`)
            });
            columns.push({
                nonSortable: true,
                key: "trash",
                hasLink: true,
                header: "",
                mapper: group => this.getActionIcons(group)
            });
        }

        const groupActions = this.groupActionButtons(selectedGroups);
        return (
            <div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <Entities entities={groups}
                          modelName="serviceGroups"
                          searchAttributes={["name", "description"]}
                          defaultSort="name"
                          inputFocus={true}
                          rowLinkMapper={() => this.gotoGroup}
                          columns={columns}
                          searchCallback={this.groupSearchCallback}
                          actionHeader={"groups"}
                          loading={loading}
                          onHover={true}
                          actions={groupActions}
                          showNew={mayCreateGroups}
                          newEntityFunc={this.newServiceGroup}
                          showActionsAlways={false}
                          {...this.props}/>
            </div>
        )
    }
}

export default ServiceGroups;
