import React from "react";
import {
    createGroup,
    deleteGroup,
    deleteServiceConnectionRequest,
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
import InputField from "../InputField";
import {sanitizeShortName, shortNameDisabled} from "../../validations/regExps";
import CheckBox from "../CheckBox";
import moment from "moment";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";

class Groups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedGroup: null,
            createGroup: false,
            editGroup: false,
            required: ["name", "short_name"],
            adminOfCollaboration: true,
            loading: true,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
        }
    }

    componentDidMount = () => {
        this.setState({loading: false});
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        promise.then(() => {
            this.props.refresh(() => {
                this.componentDidMount();
                setFlash(flashMsg);
                callback && callback();
            });
        });
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    removeServiceConnectionRequest = (service, collaboration) => {
        const action = () => this.refreshAndFlash(deleteServiceConnectionRequest(service.id),
            I18n.t("collaborationServices.serviceConnectionRequestDeleted", {
                service: service.name,
                collaboration: collaboration.name
            }), this.closeConfirmationDialog);
        this.confirm(action, I18n.t("collaborationServices.serviceConnectionRequestDeleteConfirmation"));
    };

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = () => this.setState({selectedGroup: null, createGroup: false, editGroup: false});

    validateGroupName = e => {
        const {selectedGroup, createGroup} = this.state;
        const {collaboration} = this.state;
        groupNameExists(e.target.value, collaboration.id, createGroup ? null : selectedGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateGroupShortName = e => {
        const {selectedGroup, createGroup} = this.state;
        const {collaboration} = this.state;
        groupShortNameExists(e.target.value, collaboration.id, createGroup ? null : selectedGroup.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };

    renderGroupContainer = children => {
        return (
            <div className="group-details-container">
                <a className={"back-to-groups"} onClick={this.cancelSideScreen}>
                    <ChevronLeft/>{I18n.t("models.groups.backToGroups")}
                </a>
                    {children}
            </div>
        );
    }

    renderGroupDetails = (selectedGroup) => {
        const children = (
            <div className={"group-details"}>
                <section className="header">
                    <h1>{selectedGroup.name}</h1>
                    <Button onClick={() => this.setState({editGroup: selectedGroup})} txt={I18n.t("models.groups.edit")} />
                </section>

                <p>{selectedGroup.description}</p>
            </div>
        );
        return this.renderGroupContainer(children);

    }

    renderGroupForm = (createGroup, selectedGroup) => {
        const {collaboration, user} = this.props;
        const {
            adminOfCollaboration, name, short_name, identifier, auto_provision_members, alreadyExists, initial, description,
            disabledSubmit
        } = this.state;
        const children = (
            <div className="group-form">
                <div className={"group-details-form"}>
                    <h1>{createGroup ? I18n.t("models.groups.new") : selectedGroup.name}</h1>

                    {/*<InputField value={name || ""}*/}
                    {/*            onChange={e => this.setState({*/}
                    {/*                name: e.target.value,*/}
                    {/*                alreadyExists: {...this.state.alreadyExists, name: false}*/}
                    {/*            })}*/}
                    {/*            placeholder={I18n.t("groups.namePlaceholder")}*/}
                    {/*            onBlur={this.validateGroupName}*/}
                    {/*            name={I18n.t("groups.name")}*/}
                    {/*            disabled={!adminOfCollaboration}/>*/}
                    {/*{alreadyExists.name && <span*/}
                    {/*    className="error">{I18n.t("groups.alreadyExists", {*/}
                    {/*    attribute: I18n.t("groups.name").toLowerCase(),*/}
                    {/*    value: name*/}
                    {/*})}</span>}*/}
                    {/*{(!initial && isEmpty(name)) && <span*/}
                    {/*    className="error">{I18n.t("groups.required", {*/}
                    {/*    attribute: I18n.t("groups.name").toLowerCase()*/}
                    {/*})}</span>}*/}

                    {/*<InputField value={short_name}*/}
                    {/*            name={I18n.t("groups.short_name")}*/}
                    {/*            placeholder={I18n.t("groups.shortNamePlaceHolder")}*/}
                    {/*            onBlur={this.validateGroupShortName}*/}
                    {/*            onChange={e => this.setState({*/}
                    {/*                short_name: sanitizeShortName(e.target.value),*/}
                    {/*                alreadyExists: {...this.state.alreadyExists, short_name: false}*/}
                    {/*            })}*/}
                    {/*            toolTip={I18n.t("groups.shortNameTooltip")}*/}
                    {/*            disabled={shortNameDisabled(user, createGroup, adminOfCollaboration)}/>*/}
                    {/*{alreadyExists.short_name && <span*/}
                    {/*    className="error">{I18n.t("groups.alreadyExists", {*/}
                    {/*    attribute: I18n.t("groups.short_name").toLowerCase(),*/}
                    {/*    value: short_name*/}
                    {/*})}</span>}*/}
                    {/*{(!initial && isEmpty(short_name)) && <span*/}
                    {/*    className="error">{I18n.t("groups.required", {*/}
                    {/*    attribute: I18n.t("groups.short_name").toLowerCase()*/}
                    {/*})}</span>}*/}


                    {/*<InputField*/}
                    {/*    value={`${collaboration.organisation.short_name}:${collaboration.short_name}:${short_name}`}*/}
                    {/*    name={I18n.t("groups.global_urn")}*/}
                    {/*    toolTip={I18n.t("groups.globalUrnTooltip")}*/}
                    {/*    copyClipBoard={true}*/}
                    {/*    disabled={true}/>*/}

                    {/*{!createGroup && <InputField value={identifier}*/}
                    {/*                             name={I18n.t("groups.identifier")}*/}
                    {/*                             toolTip={I18n.t("groups.identifierTooltip")}*/}
                    {/*                             disabled={true}*/}
                    {/*                             copyClipBoard={true}/>}*/}

                    {/*<InputField value={description}*/}
                    {/*            name={I18n.t("groups.description")}*/}
                    {/*            placeholder={I18n.t("groups.descriptionPlaceholder")}*/}
                    {/*            onChange={e => this.setState({description: e.target.value})}*/}
                    {/*            disabled={!adminOfCollaboration}/>*/}

                    {/*<InputField value={collaboration.name}*/}
                    {/*            name={I18n.t("groups.collaboration")}*/}
                    {/*            disabled={true}*/}
                    {/*/>*/}

                    {/*<CheckBox name="auto_provision_members" value={auto_provision_members}*/}
                    {/*          info={I18n.t("groups.autoProvisionMembers")}*/}
                    {/*          tooltip={I18n.t("groups.autoProvisionMembersTooltip")}*/}
                    {/*          onChange={e => this.setState({auto_provision_members: e.target.checked})}*/}
                    {/*          readOnly={!adminOfCollaboration}/>*/}

                    {/*{(!adminOfCollaboration && !createGroup) &&*/}
                    {/*<InputField value={moment(selectedGroup.created_at * 1000).format("LLLL")}*/}
                    {/*            disabled={true}*/}
                    {/*            name={I18n.t("organisation.created")}/>}*/}

                    {/*{(adminOfCollaboration && createGroup) &&*/}
                    {/*<section className="actions">*/}
                    {/*    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}*/}
                    {/*            onClick={this.submit}/>*/}
                    {/*    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen()}/>*/}
                    {/*</section>}*/}
                    {/*{(adminOfCollaboration && !createGroup) &&*/}
                    {/*<section className="actions">*/}
                    {/*    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancelSideScreen()}/>*/}
                    {/*    <Button className="delete" txt={I18n.t("groups.delete")}*/}
                    {/*            onClick={this.delete}/>*/}
                    {/*    <Button disabled={disabledSubmit} txt={I18n.t("groups.update")}*/}
                    {/*            onClick={this.submit}/>*/}
                    {/*</section>}*/}

                </div>
            </div>
        );
        return this.renderGroupContainer(children);}

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoGroups,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: I18n.t("groups.deleteConfirmation", {name: this.state.group.name}),
            leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {group} = this.state;
        deleteGroup(group.id).then(() => {
            this.props.history.goBack();
            setFlash(I18n.t("groups.flash.deleted", {name: group.name}));
        });
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
            const {name, isNew} = this.state;
            if (isNew) {
                createGroup(this.state).then(() => {
                    this.props.refresh();
                    setFlash(I18n.t("groups.flash.created", {name: name}));
                });
            } else {
                updateGroup(this.state).then(() => {
                    window.scrollTo(0, 0);
                    this.componentDidMount();
                    setFlash(I18n.t("groups.flash.updated", {name: name}));
                });
            }
        }
    };

    gotoGroup = group => e => {
        stopEvent(e);
        this.setState({selectedGroup: group, createGroup: false, editGroup: false});
    }

    render() {
        const {
            loading, createGroup, selectedGroup, editGroup,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationDialogQuestion
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        if (createGroup || editGroup) {
            return this.renderGroupForm(createGroup, selectedGroup);
        }
        if (selectedGroup) {
            return this.renderGroupDetails(selectedGroup)
        }
        const {collaboration, user: currentUser} = this.props;
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
                mapper: group => group.collaboration_memberships.some(cm => cm.user === currentUser.id) ?
                    <span className="person-role me">{I18n.t("models.groups.member")}</span> : null
            },

            {
                key: "memberCount",
                header: I18n.t("models.groups.memberCount")
            }, {
                key: "auto_provision_members",
                header: I18n.t("models.groups.autoProvisioning"),
                mapper: group => I18n.t(`models.groups.${group.auto_provision_members ? "on" : "off"}`)
            }]
        return (
            <div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationDialogQuestion}/>
                <Entities entities={groups} modelName="groups" searchAttributes={["name", "description"]}
                          defaultSort="name" columns={columns} loading={loading}
                          showNew={true} newEntityFunc={() => this.setState({createGroup: true, selectedGroup: null, editGroup: false})}
                          {...this.props}/>
            </div>
        )
    }
}

export default Groups;