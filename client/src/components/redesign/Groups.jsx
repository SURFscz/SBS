import React from "react";
import {
    addGroupMembers,
    createGroup,
    deleteGroup,
    deleteGroupMembers,
    groupNameExists,
    groupShortNameExists,
    updateGroup
} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import "./Groups.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Button from "../Button";
import {clearFlash, setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import {ReactComponent as MembersIcon} from "../../icons/single-neutral.svg";
import UserColumn from "./UserColumn";
import Select from "react-select";
import InputField from "../InputField";
import CheckBox from "../CheckBox";
import moment from "moment";
import {sanitizeShortName} from "../../validations/regExps";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import ClipBoardCopy from "./ClipBoardCopy";
import {AppStore} from "../../stores/AppStore";
import ErrorIndicator from "./ErrorIndicator";
import {Chip, ChipType, MetaDataList, Tooltip} from "@surfnet/sds";
import InstituteColumn from "./InstituteColumn";
import {ReactComponent as ThrashIcon} from "../../icons/trash_new.svg";
import {ReactComponent as EmailIcon} from "../../icons/email_new.svg";
import {CopyToClipboard} from "react-copy-to-clipboard";

class Groups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            required: ["name", "short_name"],
            selectedMembers: {},
            allSelected: false,
            resultAfterSearch: false,
            alreadyExists: {},
            initial: true,
            createNewGroup: false,
            selectedGroupId: null,
            editGroup: false,
            name: "",
            short_name: "",
            description: "",
            identifier: "",
            auto_provision_members: false,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
        }
    }

    componentDidMount = callback => {
        const selectedGroup = this.getSelectedGroup();
        let selectedMembers = {};
        if (selectedGroup) {
            selectedMembers = selectedGroup.collaboration_memberships.reduce((acc, entity) => {
                acc[entity.id] = {selected: false, ref: entity};
                return acc;
            }, {});
        }
        this.setState({
            loading: false,
            selectedMembers: selectedMembers,
            allSelected: false,
            resultAfterSearch: false
        }, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true, confirmationDialogOpen: false});
        if (Array.isArray(promise)) {
            Promise.all(promise).then(res => {
                this.props.refresh(() => {
                    this.componentDidMount(() => callback && callback(res));
                    setFlash(flashMsg);
                });
            });
        } else {
            promise.then(res => {
                this.props.refresh(() => {
                    this.componentDidMount(() => callback && callback(res));
                    setFlash(flashMsg);
                });
            });
        }
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedGroup = () => {
        const {selectedGroupId} = this.state;
        const {collaboration} = this.props;
        return collaboration.groups.find(g => g.id === selectedGroupId);
    }

    addMember = option => {
        const {collaboration} = this.props;
        const selectedGroup = this.getSelectedGroup();
        this.refreshAndFlash(addGroupMembers({
            groupId: selectedGroup.id,
            collaborationId: collaboration.id,
            memberIds: option.value
        }), I18n.t("groups.flash.addedMember", {
            member: option.label,
            name: selectedGroup.name
        }), () => this.componentDidMount());
    };

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedGroupId: null, createNewGroup: false, editGroup: false});
        AppStore.update(s => {
            const paths = s.breadcrumb.paths.slice(0, s.breadcrumb.paths.length - 1);
            const lastPath = paths[paths.length - 1];
            lastPath.path = null;
            s.breadcrumb.paths = paths;
        });
    }

    validateGroupName = e => {
        const {createNewGroup} = this.state;
        const {collaboration} = this.props;
        const selectedGroup = this.getSelectedGroup();
        groupNameExists(e.target.value, collaboration.id, createNewGroup ? null : selectedGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateGroupShortName = e => {
        const {createNewGroup} = this.state;
        const selectedGroup = this.getSelectedGroup();
        const {collaboration} = this.props;
        groupShortNameExists(sanitizeShortName(e.target.value), collaboration.id, createNewGroup ? null : selectedGroup.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };

    searchCallback = resultAfterSearch => {
        this.setState({resultAfterSearch: resultAfterSearch});
    }

    actionIcons = (membership, collaboration, selectedGroup) => {
        const hrefValue = encodeURI(membership.user.email);
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc=";
        return (
            <div className="admin-icons">
                {!selectedGroup.auto_provision_members && <div
                    onClick={() => this.removeMember(selectedGroup, membership)}>
                    <Tooltip anchorId={`delete-member-${membership.id}`}
                             standalone={true}
                             tip={I18n.t("models.orgMembers.removeMemberTooltip")}
                             children={<ThrashIcon/>}/>
                </div>}
                <div>
                    <a href={`mailto:${bcc}${hrefValue}`}
                       rel="noopener noreferrer">
                        <Tooltip
                            tip={I18n.t("models.orgMembers.mailMemberTooltip")}
                            anchorId={`mail-member-${membership.id}`}
                            standalone={true}
                            children={<EmailIcon/>}/>
                    </a>
                </div>
            </div>);
    }

    onCheck = memberShip => e => {
        const {selectedMembers, allSelected} = this.state;
        const checked = e.target.checked;
        const identifier = memberShip.id;
        selectedMembers[identifier].selected = checked;
        this.setState({selectedMembers: {...selectedMembers}, allSelected: (checked ? allSelected : false)});
    }

    allChecksSelected = e => {
        const {selectedMembers, resultAfterSearch} = this.state;
        const val = e.target.checked;
        let identifiers = Object.keys(selectedMembers);
        if (resultAfterSearch !== false) {
            const afterSearchIdentifiers = resultAfterSearch.map(entity => entity.id.toString());
            identifiers = identifiers.filter(id => afterSearchIdentifiers.includes(id));
        }
        identifiers.forEach(id => selectedMembers[id].selected = val);
        const newSelectedMembers = {...selectedMembers};
        this.setState({allSelected: val, selectedMembers: newSelectedMembers});
    }

    renderGroupContainer = children => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        return (
            <div className="group-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a className={"back-to-groups"} onClick={this.cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.groups.backToGroups")}
                    </a>
                </div>
                {children}
            </div>
        );
    }

    getSelectedMembersWithFilteredSearch = selectedMembers => {
        const {resultAfterSearch} = this.state;
        if (resultAfterSearch !== false) {
            const afterSearchIdentifiers = resultAfterSearch.map(entity => entity.id.toString());
            const filteredSelectedMembers = afterSearchIdentifiers.reduce((acc, id) => {
                //The resultAfterSearch may contain deleted memberships
                if (selectedMembers[id]) {
                    acc[id] = selectedMembers[id];
                }
                return acc;
            }, {});
            return filteredSelectedMembers;
        }
        return selectedMembers;
    }

    groupActionButtons = (collaboration, mayCreateGroups, membersNotInGroup, selectedMembers, selectedGroup) => {
        const filteredSelectedMembers = this.getSelectedMembersWithFilteredSearch(selectedMembers);
        const selected = Object.values(filteredSelectedMembers).filter(v => v.selected);
        const hrefValue = encodeURI(selected.map(v => v.ref.user.email).join(","));
        const disabled = selected.length === 0;
        const bcc = (collaboration.disclose_email_information && collaboration.disclose_member_information) ? "" : "?bcc=";

        const memberCanBeAdded = mayCreateGroups && membersNotInGroup.length > 0;
        return (<>
            {memberCanBeAdded && <div className="group-detail-actions">
                <Select
                    classNamePrefix="actions"
                    placeholder={I18n.t("models.groupMembers.addMembersPlaceholder")}
                    value={null}
                    onChange={this.addMember}
                    isSearchable={true}
                    options={membersNotInGroup.map(m => ({value: m.id, label: m.user.name}))}
                />
            </div>}
            {(selected.length > 0 && (selectedGroup.collaboration_memberships || []).length > 0) &&
            <div className={`actions-header admin-actions ${memberCanBeAdded ? "adjust-top" : ""}`}>

                {!selectedGroup.auto_provision_members && <div>
                    <Tooltip standalone={true}
                             anchorId={"remove-members"}
                             tip={disabled ? I18n.t("models.orgMembers.removeTooltipDisabled") : I18n.t("models.orgMembers.removeTooltip")}
                             children={<Button onClick={() => this.removeMembers(selectedGroup)}
                                               small={true}
                                               anchorId={"remove-members"}
                                               txt={I18n.t("models.orgMembers.remove")}
                                               icon={<ThrashIcon/>}/>}/>
                </div>}
                <div>
                    <Tooltip standalone={true}
                             tip={disabled ? I18n.t("models.orgMembers.mailTooltipDisabled") : I18n.t("models.orgMembers.mailTooltip")}
                             children={<a href={`${disabled ? "" : "mailto:"}${bcc}${hrefValue}`}
                                          className="sds--btn sds--btn--primary sds--btn--small"
                                          style={{border: "none", cursor: "default"}}
                                          rel="noopener noreferrer" onClick={e => {
                                 if (disabled) {
                                     stopEvent(e);
                                 } else {
                                     return true;
                                 }
                             }}>
                                 {I18n.t("models.orgMembers.mail")}<EmailIcon/>
                             </a>}/>
                </div>
            </div>}
        </>)
    }

    renderGroupDetails = (selectedGroup, collaboration, currentUser, mayCreateGroups, showMemberView, selectedMembers, allSelected) => {
        let i = 0;
        const columns = [
            {
                nonSortable: true,
                key: "check",
                header: <CheckBox value={allSelected} name={"allSelected"}
                                  onChange={this.allChecksSelected}/>,
                mapper: entity => <div className="check">
                    <CheckBox name={"" + ++i} onChange={this.onCheck(entity)}
                              value={(selectedMembers[entity.id] || {}).selected || false}/>
                </div>
            },
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: membership => <div className="member-icon">
                    {(membership.role === "admin") &&
                    <Tooltip standalone={true} children={<UserIcon/>} tip={I18n.t("tooltips.admin")}/>}
                    {(membership.role !== "admin") &&
                    <Tooltip standalone={true} children={<MembersIcon/>} tip={I18n.t("tooltips.user")}/>}
                </div>
            },
            {
                nonSortable: true,
                key: "name",
                showHeader: !Object.values(selectedMembers).some(m => m.selected),
                header: I18n.t("models.users.name_email"),
                mapper: membership => <UserColumn entity={membership}
                                                  currentUser={currentUser}
                                                  hideEmail={showMemberView && !collaboration.disclose_email_information}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                showHeader: true,
                mapper: membership => <InstituteColumn entity={membership} currentUser={currentUser}/>
            },
        ];

        if (mayCreateGroups) {
            columns.push({
                nonSortable: true,
                key: selectedGroup.auto_provision_members ? "trash_disabled" : "trash",
                header: "",
                mapper: membership => this.actionIcons(membership, collaboration, selectedGroup)
            });
        }

        const metaDataListItems = [{
            label: I18n.t("models.groups.autoProvisioning"),
            values: [I18n.t(`models.groups.${selectedGroup.auto_provision_members ? "on" : "off"}`)]
        }, {
            label: I18n.t("collaboration.joinRequestsHeader"),
            values: [
                <span className="contains-copy">
                        <CopyToClipboard text={selectedGroup.global_urn}>
                            <span className={"copy-link"} onClick={e => {
                                const me = e.target;
                                me.classList.add("copied");
                                setTimeout(() => me.classList.remove("copied"), 1250);
                            }}>
                                {selectedGroup.global_urn}
                            </span>
                        </CopyToClipboard>
                        <ClipBoardCopy transparentBackground={true} txt={selectedGroup.global_urn}/>
                    </span>
            ]
        }];
        const membersNotInGroup = isEmpty(selectedGroup.collaboration_memberships) ? collaboration.collaboration_memberships :
            collaboration.collaboration_memberships.filter(m => selectedGroup.collaboration_memberships.every(c => c.id !== m.id));
        const actions = this.groupActionButtons(collaboration, mayCreateGroups, membersNotInGroup, selectedMembers, selectedGroup);
        const queryParam = `name=${encodeURIComponent(I18n.t("breadcrumb.group", {name: selectedGroup.name}))}&back=${encodeURIComponent(window.location.pathname)}`;
        const children = (
            <div className={"group-details"}>
                <section className="header">
                    <h1>{selectedGroup.name}</h1>
                    {mayCreateGroups &&
                    <div className="header-actions">
                        <Button onClick={() => this.setState(this.newGroupState(selectedGroup))}
                                small={true}
                                txt={I18n.t("models.groups.edit")}/>
                        {currentUser.admin && <span className="history"
                                                    onClick={() => {
                                                        clearFlash();
                                                        this.props.history.push(`/audit-logs/groups/${selectedGroup.id}?${queryParam}`)
                                                    }}>
                            <FontAwesomeIcon icon="history"/>{I18n.t("home.history")}
                        </span>}
                    </div>}

                </section>
                <p className={`description ${mayCreateGroups ? "" : "no-header-actions"}`}>{selectedGroup.description}</p>
                {metaDataListItems.length > 0 && <MetaDataList items={metaDataListItems}/>}
                <Entities entities={selectedGroup.collaboration_memberships}
                          actions={actions}
                          actionHeader={"collaboration-groups"}
                          modelName="groupMembers"
                          showActionsAlways={!isEmpty(actions)}
                          searchCallback={this.searchCallback}
                          defaultSort="user__name"
                          searchAttributes={["user__name", "user__email"]}
                          loading={false}
                          onHover={true}
                          columns={columns}/>
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
        identifier: group ? group.identifier : "",
        auto_provision_members: group ? group.auto_provision_members : false,
        alreadyExists: {},
        initial: true,
        description: group ? group.description : "",
    });

    renderGroupForm = (createNewGroup, selectedGroup, adminOfCollaboration) => {
        const {collaboration, user} = this.props;
        const {
            name, short_name, identifier, auto_provision_members, alreadyExists, initial, description
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const children = (
            <div className="group-form">
                <h1>{createNewGroup ? I18n.t("models.groups.new") : selectedGroup.name}</h1>

                <InputField value={name || ""}
                            onChange={e => this.setState({
                                name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            placeholder={I18n.t("groups.namePlaceholder")}
                            onBlur={this.validateGroupName}
                            name={I18n.t("groups.name")}
                            disabled={!adminOfCollaboration || !isEmpty(selectedGroup?.service_group_id)}/>
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
                            onBlur={this.validateGroupShortName}
                            onChange={e => this.setState({
                                short_name: sanitizeShortName(e.target.value),
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            error={alreadyExists.short_name || (!initial && isEmpty(short_name))}
                            toolTip={I18n.t("groups.shortNameTooltip")}
                            disabled={(!createNewGroup && !user.admin) || !isEmpty(selectedGroup?.service_group_id)}/>
                {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.short_name").toLowerCase(),
                    value: short_name
                })}/>}
                {(!initial && isEmpty(short_name)) && <ErrorIndicator msg={I18n.t("groups.required", {
                    attribute: I18n.t("groups.short_name").toLowerCase()
                })}/>}
                <InputField
                    value={`${collaboration.organisation.short_name}:${collaboration.short_name}:${isEmpty(short_name) ? "" : short_name}`}
                    name={I18n.t("groups.global_urn")}
                    toolTip={I18n.t("groups.globalUrnTooltip")}
                    copyClipBoard={true}
                    disabled={true}/>

                {!createNewGroup && <InputField value={identifier}
                                                name={I18n.t("groups.identifier")}
                                                toolTip={I18n.t("groups.identifierTooltip")}
                                                disabled={true}
                                                copyClipBoard={true}/>}

                <InputField value={description}
                            name={I18n.t("groups.description")}
                            placeholder={I18n.t("groups.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            multiline={true}
                            disabled={!adminOfCollaboration || !isEmpty(selectedGroup?.service_group_id)}/>

                <CheckBox name="auto_provision_members" value={auto_provision_members}
                          info={I18n.t("groups.autoProvisionMembers")}
                          tooltip={I18n.t("groups.autoProvisionMembersTooltip")}
                          onChange={e => this.setState({auto_provision_members: e.target.checked})}
                          readOnly={!adminOfCollaboration}/>

                {(!adminOfCollaboration && !createNewGroup) &&
                <InputField value={moment(selectedGroup.created_at * 1000).format("LLLL")}
                            disabled={true}
                            name={I18n.t("organisation.created")}/>}

                <section className="actions">
                    {(adminOfCollaboration && !createNewGroup && isEmpty(selectedGroup?.service_group_id)) &&
                    <Button warningButton={true}
                            onClick={this.delete}/>}
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                            onClick={this.cancelSideScreen}/>
                    <Button disabled={disabledSubmit}
                            txt={I18n.t(`forms.save`)}
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
            cancelDialogAction: this.gotoGroups,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    removeMember = (group, member) => {
        const {collaboration} = this.props;
        const action = () => this.refreshAndFlash(deleteGroupMembers(group.id, member.id, collaboration.id),
            I18n.t("groups.flash.deletedMember", {
                member: member.user.name,
                name: group.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("models.groups.deleteMemberConfirmation", {name: member.user.name}));
    };

    removeMembers = group => {
        const {collaboration} = this.props;
        const {selectedMembers} = this.state;
        const filteredSelectedMembers = this.getSelectedMembersWithFilteredSearch(selectedMembers);
        const promises = Object.values(filteredSelectedMembers).filter(m => m.selected).map(m => deleteGroupMembers(group.id, m.ref.id, collaboration.id))
        const action = () => this.refreshAndFlash(promises,
            I18n.t("groups.flash.deletedMembers", {
                name: group.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("models.groups.deleteMembersConfirmation"));
    };

    delete = () => {
        const selectedGroup = this.getSelectedGroup();
        const action = () => this.refreshAndFlash(deleteGroup(selectedGroup.id),
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
            const {collaboration} = this.props;
            if (createNewGroup) {
                this.refreshAndFlash(createGroup({...this.state, collaboration_id: collaboration.id}),
                    I18n.t("groups.flash.created", {name: name}),
                    res => {
                        this.gotoGroup({id: res.id, name: name})();
                    });
            } else {
                const {selectedGroupId} = this.state;
                this.refreshAndFlash(updateGroup({
                        ...this.state,
                        id: selectedGroupId,
                        collaboration_id: collaboration.id
                    }),
                    I18n.t("groups.flash.updated", {name: name}),
                    () => this.gotoGroup({id: selectedGroupId, name: name})());
            }
        } else {
            window.scrollTo(0, 0);
        }
    }

    newGroup = () => {
        AppStore.update(s => {
            const {collaboration} = this.props;
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = `/collaborations/${collaboration.id}`
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
        }, () => {
            const selectedGroup = this.getSelectedGroup();
            const selectedMembers = selectedGroup.collaboration_memberships.reduce((acc, entity) => {
                acc[entity.id] = {selected: false, ref: entity};
                return acc;
            }, {});
            this.setState({selectedMembers: selectedMembers, allSelected: false});
        });
        AppStore.update(s => {
            const {collaboration} = this.props;
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = `/collaborations/${collaboration.id}`
            paths.push({
                value: I18n.t("breadcrumb.group", {name: group.name})
            })
            s.breadcrumb.paths = paths;
        });
    }

    openService = service_group => e => {
        if (e.metaKey || e.ctrlKey) {
            return;
        }
        stopEvent(e);
        clearFlash();
        this.props.history.push(`/services/${service_group.service_id}`);
    };

    render() {
        const {
            loading, createNewGroup, editGroup, selectedMembers, allSelected
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {collaboration, user: currentUser} = this.props;
        const {showMemberView} = this.props;
        const selectedGroup = this.getSelectedGroup();
        const mayCreateGroups = isUserAllowed(ROLES.COLL_ADMIN, currentUser, collaboration.organisation_id, collaboration.id) && !showMemberView;
        if (createNewGroup || (editGroup && selectedGroup)) {
            return this.renderGroupForm(createNewGroup, selectedGroup, mayCreateGroups);
        }
        if (selectedGroup) {
            return this.renderGroupDetails(selectedGroup, collaboration, currentUser, mayCreateGroups, showMemberView, selectedMembers, allSelected);
        }
        const groups = collaboration.groups;
        groups.forEach(group => {
            group.memberCount = group.collaboration_memberships.length;
        })

        const columns = [
            {
                key: "name",
                header: I18n.t("models.groups.name"),
                mapper: group => <a href={`${group.name}`}
                                    className={"neutral-appearance"}
                                    onClick={this.gotoGroup(group)}>{group.name}</a>,
            },
            {
                key: "description",
                header: I18n.t("models.groups.description"),
                mapper: group => <span className={"cut-of-lines"}>{group.description}</span>
            },
            {
                nonSortable: true,
                key: "member",
                header: "",
                mapper: group => group.collaboration_memberships.some(cm => cm.user.id === currentUser.id) ?
                    <Chip type={ChipType.Main_100}
                          label={I18n.t("models.groups.member")}/>
                    : null
            },
            {
                key: "service_group__service__name",
                header: I18n.t("models.groups.service_group"),
                mapper: group => group.service_group ? <a href={`/services/${group.service_group.service_id}`}
                                                          className={"neutral-appearance"}
                                                          onClick={this.openService(group.service_group)}>
                    {group.service_group.service.name}</a> : ""
            },
            {
                key: "memberCount",
                header: I18n.t("models.groups.memberCount")
            },
        ]
        if (mayCreateGroups) {
            columns.push({
                key: "auto_provision_members",
                header: I18n.t("models.groups.autoProvisioning"),
                mapper: group => I18n.t(`models.groups.${group.auto_provision_members ? "on" : "off"}`)
            });
        }
        return (
            <div>
                <Entities entities={groups}
                          modelName="groups"
                          searchAttributes={["name", "description"]}
                          defaultSort="name"
                          rowLinkMapper={() => this.gotoGroup}
                          columns={columns}
                          hideTitle={true}
                          loading={loading}
                          showNew={mayCreateGroups}
                          newEntityFunc={this.newGroup}
                          {...this.props}/>
            </div>
        )
    }
}

export default Groups;