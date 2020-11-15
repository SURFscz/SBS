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
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {CopyToClipboard} from "react-copy-to-clipboard";
import {ReactComponent as UserIcon} from "../../icons/users.svg";
import UserColumn from "./UserColumn";
import Select from "react-select";
import InputField from "../InputField";
import CheckBox from "../CheckBox";
import moment from "moment";
import {sanitizeShortName, shortNameDisabled} from "../../validations/regExps";
import {isUserAllowed, ROLES} from "../../utils/UserRole";

class Groups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            required: ["name", "short_name"],
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
        this.setState({loading: false}, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        promise.then(res => {
            this.props.refresh(() => {
                this.componentDidMount(() => callback && callback(res));
                setFlash(flashMsg);
            });
        });
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
        groupShortNameExists(e.target.value, collaboration.id, createNewGroup ? null : selectedGroup.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };

    renderGroupContainer = children => {
        const {confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion} = this.state;
        return (
            <div className="group-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <a className={"back-to-groups"} onClick={this.cancelSideScreen} href={"/cancel"}>
                    <ChevronLeft/>{I18n.t("models.groups.backToGroups")}
                </a>
                {children}
            </div>
        );
    }

    renderGroupDetails = (selectedGroup, collaboration, currentUser, mayCreateGroups) => {
        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: () => <div className="member-icon">
                    <UserIcon/>
                </div>
            },
            {
                nonSortable: true,
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: membership => <UserColumn entity={membership} currentUser={currentUser}/>
            },
            {
                key: "user__schac_home_organisation",
                header: I18n.t("models.users.institute"),
                mapper: membership => membership.user.schac_home_organisation
            },
        ];
        if (mayCreateGroups) {
            columns.push({
                nonSortable: true,
                key: selectedGroup.auto_provision_members ? "trash_disabled" : "trash",
                header: "",
                mapper: membership => <span onClick={() => {
                    !selectedGroup.auto_provision_members && this.removeMember(selectedGroup, membership)
                }}>
                    <FontAwesomeIcon icon="trash"/></span>
            });
        }
        const options = collaboration.collaboration_memberships
            .filter(m => selectedGroup.collaboration_memberships.every(c => c.id !== m.id))
            .map(m => ({value: m.id, label: m.user.name}));
        const actions = mayCreateGroups ? <div className="group-detail-actions">
            <Select
                classNamePrefix="actions"
                placeholder={I18n.t("models.groupMembers.addMembersPlaceholder")}
                value={null}
                onChange={this.addMember}
                isSearchable={true}
                options={options}
            />
        </div> : null;
        const queryParam = `name=${encodeURIComponent(selectedGroup.name)}&back=${encodeURIComponent(window.location.pathname)}`;
        const children = (
            <div className={"group-details"}>
                <section className="header">
                    <h1>{selectedGroup.name}</h1>
                    {mayCreateGroups &&
                    <div className="header-actions">
                        <Button onClick={() => this.setState(this.newGroupState(selectedGroup))}
                                txt={I18n.t("models.groups.edit")}/>
                        <span className="history"
                              onClick={() => this.props.history.push(`/audit-logs/groups/${selectedGroup.id}?${queryParam}`)}>
                        <FontAwesomeIcon icon="history"/>{I18n.t("home.history")}
                    </span>
                    </div>}

                </section>
                <p className={`description ${mayCreateGroups ? "" : "no-header-actions" }`}>{selectedGroup.description}</p>
                <div className="org-attributes-container">
                    <div className="org-attributes">
                        <span>{I18n.t("models.groups.autoProvisioning")}</span>
                        <span>{I18n.t(`models.groups.${selectedGroup.auto_provision_members ? "on" : "off"}`)}</span>
                    </div>
                    <div className="org-attributes">
                        <span>{I18n.t("models.groups.urn")}</span>
                        <span>{selectedGroup.global_urn}</span>
                    </div>
                    <CopyToClipboard text={selectedGroup.global_urn}>
                        <section className="copy-to-clipboard">
                            <FontAwesomeIcon icon="copy"/>
                        </section>
                    </CopyToClipboard>
                </div>
                <Entities entities={selectedGroup.collaboration_memberships}
                          actions={actions}
                          modelName="groupMembers"
                          defaultSort="user__name"
                          searchAttributes={["user__name", "user__email"]}
                          loading={false}
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
                <div className={"group-details-form"}>
                    <h1>{createNewGroup ? I18n.t("models.groups.new") : selectedGroup.name}</h1>

                    <InputField value={name || ""}
                                onChange={e => this.setState({
                                    name: e.target.value,
                                    alreadyExists: {...this.state.alreadyExists, name: false}
                                })}
                                placeholder={I18n.t("groups.namePlaceholder")}
                                onBlur={this.validateGroupName}
                                name={I18n.t("groups.name")}
                                disabled={!adminOfCollaboration}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("groups.alreadyExists", {
                        attribute: I18n.t("groups.name").toLowerCase(),
                        value: name
                    })}</span>}
                    {(!initial && isEmpty(name)) && <span
                        className="error">{I18n.t("groups.required", {
                        attribute: I18n.t("groups.name").toLowerCase()
                    })}</span>}

                    <InputField value={short_name}
                                name={I18n.t("groups.short_name")}
                                placeholder={I18n.t("groups.shortNamePlaceHolder")}
                                onBlur={this.validateGroupShortName}
                                onChange={e => this.setState({
                                    short_name: sanitizeShortName(e.target.value),
                                    alreadyExists: {...this.state.alreadyExists, short_name: false}
                                })}
                                toolTip={I18n.t("groups.shortNameTooltip")}
                                disabled={shortNameDisabled(user, createNewGroup, adminOfCollaboration)}/>
                    {alreadyExists.short_name && <span
                        className="error">{I18n.t("groups.alreadyExists", {
                        attribute: I18n.t("groups.short_name").toLowerCase(),
                        value: short_name
                    })}</span>}
                    {(!initial && isEmpty(short_name)) && <span
                        className="error">{I18n.t("groups.required", {
                        attribute: I18n.t("groups.short_name").toLowerCase()
                    })}</span>}


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
                                disabled={!adminOfCollaboration}/>

                    <InputField value={collaboration.name}
                                name={I18n.t("groups.collaboration")}
                                disabled={true}
                    />

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
                        {(adminOfCollaboration && !createNewGroup) &&
                        <Button warningButton={true} txt={I18n.t("groups.delete")}
                                onClick={this.delete}/>}
                        <Button className="white" txt={I18n.t("forms.cancel")}
                                onClick={() => this.setState({editGroup: false, createNewGroup: false})}/>
                        <Button disabled={disabledSubmit} txt={I18n.t(`forms.save`)}
                                onClick={this.submit}/>
                    </section>

                </div>
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
                        this.setState({
                            selectedGroupId: res.id,
                            editGroup: false,
                            createNewGroup: false
                        })
                    });
            } else {
                const {selectedGroupId} = this.state;
                this.refreshAndFlash(updateGroup({
                        ...this.state,
                        id: selectedGroupId,
                        collaboration_id: collaboration.id
                    }),
                    I18n.t("groups.flash.updated", {name: name}),
                    res => this.setState({
                        editGroup: false,
                        createNewGroup: false
                    }));
            }
        }
    }

    gotoGroup = group => e => {
        stopEvent(e);
        this.setState({selectedGroupId: group.id, createNewGroup: false, editGroup: false});
    }

    render() {
        const {
            loading, createNewGroup, editGroup
        } = this.state;
        const {collaboration, user: currentUser} = this.props;
        const {showMemberView} = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const selectedGroup = this.getSelectedGroup();
        const mayCreateGroups = isUserAllowed(ROLES.COLL_ADMIN, currentUser, collaboration.organisation_id, collaboration.id) && !showMemberView;
        if (createNewGroup || (editGroup && selectedGroup)) {
            return this.renderGroupForm(createNewGroup, selectedGroup, mayCreateGroups);
        }
        if (selectedGroup) {
            return this.renderGroupDetails(selectedGroup, collaboration, currentUser, mayCreateGroups)
        }
        const groups = collaboration.groups;
        groups.forEach(group => {
            group.memberCount = group.collaboration_memberships.length;
        })

        const columns = [
            {
                key: "name",
                header: I18n.t("models.groups.name"),
                mapper: group => <a href={`${group.name}`} onClick={this.gotoGroup(group)}>{group.name}</a>,
            },
            {
                key: "description",
                header: I18n.t("models.groups.description"),
            },
            {
                nonSortable: true,
                key: "member",
                header: "",
                mapper: group => group.collaboration_memberships.some(cm => cm.user.id === currentUser.id) ?
                    <span className="person-role me">{I18n.t("models.groups.member")}</span> : null
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
                          loading={loading}
                          showNew={mayCreateGroups}
                          newEntityFunc={() => this.setState(this.newGroupState())}
                          {...this.props}/>
            </div>
        )
    }
}

export default Groups;