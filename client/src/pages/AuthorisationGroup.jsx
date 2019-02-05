import React from "react";
import {
    addAuthorisationGroupMembers,
    addAuthorisationGroupServices,
    authorisationGroupById,
    authorisationGroupNameExists, collaborationLiteById,
    collaborationServices,
    createAuthorisationGroup,
    deleteAuthorisationGroup,
    deleteAuthorisationGroupMembers,
    deleteAuthorisationGroupServices,
    updateAuthorisationGroup
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./AuthorisationGroup.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {isEmpty, sortObjects, stopEvent} from "../utils/Utils";
import SelectField from "../components/SelectField";
import {authorisationGroupStatuses} from "../forms/constants";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";

import Select from "react-select";
import moment from "moment";

class AuthorisationGroup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.statusOptions = authorisationGroupStatuses.map(type => ({
            value: type,
            label: I18n.t(`authorisationGroup.statusValues.${type}`)
        }));
        this.state = {
            collaboration: undefined,
            collaboration_id: undefined,
            authorisationGroup: {},
            allServices: [],
            sortedServices: [],
            sortedServicesBy: "name",
            reverseServices: false,
            allMembers: [],
            sortedMembers: [],
            sortedMembersBy: "user__name",
            reverseMembers: false,
            name: "",
            uri: "",
            description: "",
            status: this.statusOptions[0].value,
            required: ["name"],
            alreadyExists: {},
            initial: true,
            isNew: true,
            confirmationDialogOpen: false,
            leavePage: true,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            back: "/collaborations"
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        const {user} = this.props;
        if (params.id && params.collaboration_id) {
            const collaboration_id = parseInt(params.collaboration_id, 10);
            const member = (user.collaboration_memberships || []).find(membership => membership.collaboration_id === collaboration_id);
            if (isEmpty(member) && !user.admin) {
                this.props.history.push("/404");
                return;
            }
            if (member.role !== "admin" && !user.admin && params.id === "new") {
                this.props.history.push("/404");
                return;
            }
            const back = member.role !== "admin" && !user.admin ? "/home" : `/collaboration-authorisation-groups/${params.collaboration_id}`;
            const adminOfCollaboration = member.role === "admin" || user.admin;
            if (params.id !== "new") {
                const collDetail = adminOfCollaboration ? collaborationServices : collaborationLiteById;
                Promise.all([collDetail(params.collaboration_id), authorisationGroupById(params.id, params.collaboration_id)])
                    .then(res => {
                        const {sortedServicesBy, reverseServices, sortedMembersBy, reverseMembers} = this.state;
                        const collaboration = res[0];
                        const authorisationGroup = res[1];
                        const allServices = this.sortedCollaborationServices(collaboration);
                        const allMembers = this.sortedCollaborationMembers(authorisationGroup.collaboration);
                        this.setState({
                            ...authorisationGroup,
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            authorisationGroup: authorisationGroup,
                            allMembers: allMembers,
                            sortedMembers: sortObjects(authorisationGroup.collaboration_memberships, sortedMembersBy, reverseMembers),
                            allServices: allServices,
                            sortedServices: sortObjects(authorisationGroup.services, sortedServicesBy, reverseServices),
                            isNew: false,
                            back: back,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            } else {
                collaborationServices(params.collaboration_id, true)
                    .then(collaboration => {
                        const allServices = this.sortedCollaborationServices(collaboration);
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            allServices: allServices,
                            allMembers: allMembers,
                            back: back,
                            adminOfCollaboration: adminOfCollaboration
                        })
                    });
            }
        } else {
            this.props.history.push("/404");
        }
    };

    refreshServices = callBack => {
        const params = this.props.match.params;
        authorisationGroupById(params.id, params.collaboration_id)
            .then(json => {
                const {sortedServicesBy, reverseServices} = this.state;
                this.setState({
                    sortedServices: sortObjects(json.services, sortedServicesBy, reverseServices)
                }, callBack())
            });
    };

    refreshMembers = callBack => {
        const params = this.props.match.params;
        authorisationGroupById(params.id, params.collaboration_id)
            .then(json => {
                const {sortedMembersBy, reverseMembers} = this.state;
                this.setState({
                    sortedMembers: sortObjects(json.collaboration_memberships, sortedMembersBy, reverseMembers)
                }, callBack())
            });
    };

    sortedCollaborationMembers = collaboration => (collaboration.collaboration_memberships || [])
        .sort((a, b) => a.user.name.localeCompare(b.user.name))
        .map(member => ({
            value: member.id,
            label: this.memberToOption(member)
        }));

    sortedCollaborationServices = collaboration => (collaboration.services || [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(service => ({
            value: service.id,
            label: this.serviceToOption(service)
        }));

    memberToOption = member => `${member.user.name} - ${member.user.email}`;

    serviceToOption = service => `${service.name} - ${service.entity_id}`;

    validateAuthorisationGroupName = e => {
        const {isNew, collaboration, authorisationGroup} = this.state;
        authorisationGroupNameExists(e.target.value, collaboration.id, isNew ? null : authorisationGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoAuthorisations = () => {
        const {back} = this.state;
        this.setState({confirmationDialogOpen: false},
            () => this.props.history.push(back));
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoAuthorisations,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog, confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {authorisationGroup, back} = this.state;
        deleteAuthorisationGroup(authorisationGroup.id).then(() => {
            this.props.history.push(back);
            setFlash(I18n.t("authorisationGroup.flash.deleted", {name: authorisationGroup.name}));
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
                createAuthorisationGroup(this.state).then(() => {
                    this.gotoAuthorisations();
                    setFlash(I18n.t("authorisationGroup.flash.created", {name: name}));
                });
            } else {
                updateAuthorisationGroup(this.state).then(() => {
                    this.gotoAuthorisations();
                    setFlash(I18n.t("authorisationGroup.flash.updated", {name: name}));
                });
            }
        }
    };

    addService = option => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupServices({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            serviceIds: option.value
        }).then(() => {
            this.refreshServices(() => setFlash(I18n.t("authorisationGroup.flash.addedService", {
                service: option.label,
                name: authorisationGroupName
            })));
        });
    };

    removeService = service => () => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        deleteAuthorisationGroupServices(authorisationGroup.id, service.id, collaboration.id).then(() => {
            this.refreshServices(() => setFlash(I18n.t("authorisationGroup.flash.deletedService", {
                service: service.name,
                name: authorisationGroupName
            })));
        });
    };

    addMember = option => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        addAuthorisationGroupMembers({
            authorisationGroupId: authorisationGroup.id,
            collaborationId: collaboration.id,
            memberIds: option.value
        }).then(() => {
            this.refreshMembers(() => setFlash(I18n.t("authorisationGroup.flash.addedMember", {
                member: option.label,
                name: authorisationGroupName
            })));
        });
    };

    removeMember = member => () => {
        const {collaboration, authorisationGroup, name} = this.state;
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;
        deleteAuthorisationGroupMembers(authorisationGroup.id, member.id, collaboration.id).then(() => {
            this.refreshMembers(() => setFlash(I18n.t("authorisationGroup.flash.deletedMember", {
                member: member.user.name,
                name: authorisationGroupName
            })));
        });
    };

    sortServicesTable = (services, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedServices = sortObjects(services, name, reversed);
        this.setState({sortedServices: sortedServices, sortedServicesBy: name, reverseServices: reversed});
    };

    sortMembersTable = (members, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedMembers = sortObjects(members, name, reversed);
        this.setState({sortedMembers: sortedMembers, sortedMembersBy: name, reverseMembers: reversed});
    };

    renderConnectedMembers = (adminOfCollaboration, collaboration, authorisationGroupName, connectedMembers, sorted, reverse) => {
        const names = ["actions", "user__name", "user__email", "user__uid", "role", "created_at"];
        if (!adminOfCollaboration) {
            names.shift();
        }
        const role = {value: "admin", label: "Admin"};
        const membersTitle = I18n.t("authorisationGroup.membersTitle", {name: authorisationGroupName});
        return (
            <div className="authorisation-members-connected">
                <p className="title">{membersTitle}</p>
                {adminOfCollaboration &&
                <em className="warning">{I18n.t("authorisationGroup.deleteMemberWarning")}</em>}
                <table className="connected-members">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortMembersTable(connectedMembers, name, sorted, reverse)}>
                                {I18n.t(`authorisationGroup.member.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="member-delete">
                                <FontAwesomeIcon icon="question-circle"/>
                                <ReactTooltip id="member-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("authorisationGroup.deleteMemberTooltip", {name: authorisationGroupName})}}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {connectedMembers.map((member, i) => <tr key={i}>
                        {adminOfCollaboration && <td className="actions">
                            <FontAwesomeIcon icon="trash" onClick={this.removeMember(member)}/>
                        </td>
                        }
                        <td className="name">{member.user.name}</td>
                        <td className="email">{member.user.email}</td>
                        <td className="uid">{member.user.uid}</td>
                        <td className="role">
                            <Select
                                classNamePrefix="select-disabled"
                                value={role}
                                options={[role]}
                                isDisabled={true}/></td>
                        <td className="since">{moment(member.created_at * 1000).format("LL")}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    renderConnectedServices = (adminOfCollaboration, collaboration, authorisationGroupName, connectedServices, sorted, reverse) => {
        const names = ["actions", "name", "entity_id", "description"];
        if (!adminOfCollaboration) {
            names.shift();
        }
        return (<div className="authorisation-services-connected">
                <p className="title">{I18n.t("authorisationGroup.connectedServices", {name: authorisationGroupName})}</p>
                {adminOfCollaboration &&
                <em className="warning">{I18n.t("authorisationGroup.deleteServiceWarning")}</em>}
                <table className="connected-services">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortServicesTable(connectedServices, name, sorted, reverse)}>
                                {I18n.t(`authorisationGroup.service.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                                {name === "actions" &&
                                <span data-tip data-for="service-delete">
                                <FontAwesomeIcon icon="question-circle"/>
                                <ReactTooltip id="service-delete" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("authorisationGroup.deleteServiceTooltip", {name: authorisationGroupName})}}/>
                                </ReactTooltip>
                            </span>}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {connectedServices.map(service => <tr key={service.id}>
                        {adminOfCollaboration && <td className="actions">
                            <FontAwesomeIcon icon="trash" onClick={this.removeService(service)}/>
                        </td>}
                        <td className="name">{service.name}</td>
                        <td className="entity_id">{service.entity_id}</td>
                        <td className="description">{service.description}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    authorisationMembers = (adminOfCollaboration, collaboration, authorisationGroupName, allMembers, sortedMembers, sortedMembersBy, reverseMembers) => {
        const availableMembers = allMembers.filter(member => !sortedMembers.find(s => s.id === member.value));
        return (
            <div className={`authorisation-members ${adminOfCollaboration ? "" : "no-admin"}`}>
                {adminOfCollaboration && <Select className="services-select"
                                                 placeholder={I18n.t("authorisationGroup.searchMembers", {name: authorisationGroupName})}
                                                 onChange={this.addMember}
                                                 options={availableMembers}
                                                 value={null}
                                                 isSearchable={true}
                                                 isClearable={true}/>
                }
                {this.renderConnectedMembers(adminOfCollaboration, collaboration, authorisationGroupName, sortedMembers, sortedMembersBy, reverseMembers)}
            </div>
        );


    };

    authorisationServices = (adminOfCollaboration, collaboration, authorisationGroupName, allServices, sortedServices, sortedServicesBy, reverseServices) => {
        const availableServices = allServices.filter(service => !sortedServices.find(s => s.id === service.value));
        return (
            <div className={`authorisation-services ${adminOfCollaboration ? "" : "no-admin"}`}>
                {adminOfCollaboration && <Select className="services-select"
                                                 placeholder={I18n.t("authorisationGroup.searchServices", {name: authorisationGroupName})}
                                                 onChange={this.addService}
                                                 options={availableServices}
                                                 value={null}
                                                 isSearchable={true}
                                                 isClearable={true}/>
                }
                {this.renderConnectedServices(adminOfCollaboration, collaboration, authorisationGroupName, sortedServices, sortedServicesBy, reverseServices)}
            </div>);
    };


    authorisationGroupDetails = (adminOfCollaboration, name, alreadyExists, initial, description, uri, status, isNew, disabledSubmit, authorisationGroup) => {
        return (
            <div className="authorisation-group">
                <InputField value={name} onChange={e => this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })}
                            placeholder={I18n.t("authorisationGroup.namePlaceholder")}
                            onBlur={this.validateAuthorisationGroupName}
                            name={I18n.t("authorisationGroup.name")}
                            disabled={!adminOfCollaboration}/>
                {alreadyExists.name && <span
                    className="error">{I18n.t("authorisationGroup.alreadyExists", {
                    attribute: I18n.t("authorisationGroup.name").toLowerCase(),
                    value: name
                })}</span>}
                {(!initial && isEmpty(name)) && <span
                    className="error">{I18n.t("authorisationGroup.required", {
                    attribute: I18n.t("authorisationGroup.name").toLowerCase()
                })}</span>}

                <InputField value={description}
                            name={I18n.t("authorisationGroup.description")}
                            placeholder={I18n.t("authorisationGroup.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            disabled={!adminOfCollaboration}/>

                <InputField value={uri}
                            name={I18n.t("authorisationGroup.uri")}
                            placeholder={I18n.t("authorisationGroup.uriPlaceholder")}
                            onChange={e => this.setState({uri: e.target.value})}
                            disabled={!adminOfCollaboration}/>

                <SelectField value={this.statusOptions.find(option => status === option.value)}
                             options={this.statusOptions}
                             name={I18n.t("authorisationGroup.status")}
                             clearable={true}
                             placeholder={I18n.t("authorisationGroup.statusPlaceholder")}
                             onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}
                             disabled={!adminOfCollaboration}/>
                {(!isNew && !isEmpty(authorisationGroup)) &&
                <InputField value={moment(authorisationGroup.created_at * 1000).format("LLLL")}
                            disabled={true}
                            name={I18n.t("organisation.created")}/>}

                {(adminOfCollaboration && isNew) &&
                <section className="actions">
                    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                            onClick={this.submit}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}
                {(adminOfCollaboration && !isNew) &&
                <section className="actions">
                    <Button disabled={disabledSubmit} txt={I18n.t("authorisationGroup.update")}
                            onClick={this.submit}/>
                    <Button className="delete" txt={I18n.t("authorisationGroup.delete")}
                            onClick={this.delete}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}

            </div>);
    };

    render() {
        const {
            alreadyExists, collaboration, initial, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
            name, uri, description, status, authorisationGroup, isNew, back, leavePage,
            allServices, sortedServices, sortedServicesBy, reverseServices,
            allMembers, sortedMembers, sortedMembersBy, reverseMembers, adminOfCollaboration
        } = this.state;
        if (!collaboration) {
            return null;
        }
        const authorisationGroupName = isEmpty(authorisationGroup) ? name : authorisationGroup.name;

        const disabledSubmit = !initial && !this.isValid();
        const title = adminOfCollaboration ? I18n.t("authorisationGroup.backToCollaborationAuthorisationGroups", {name: collaboration.name}) : I18n.t("home.backToHome");
        let detailsTitle;
        if (adminOfCollaboration) {
            detailsTitle = isNew ? I18n.t("authorisationGroup.titleNew") : I18n.t("authorisationGroup.titleUpdate", {name: authorisationGroup.name});
        } else {
            detailsTitle = I18n.t("authorisationGroup.titleReadOnly", {name: authorisationGroup.name});
        }
        const servicesTitle = I18n.t("authorisationGroup.servicesTitle", {name: authorisationGroup.name});
        const membersTitle = I18n.t("authorisationGroup.membersTitle", {name: authorisationGroupName});
        const showTitles = !isNew && adminOfCollaboration;
        return (
            <div className="mod-authorisation-group">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("authorisationGroup.deleteConfirmation", {name: authorisationGroup.name})}/>
                <div className="title">
                    <a href={back} onClick={e => {
                        stopEvent(e);
                        this.props.history.push(back)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {title}
                    </a>
                    {showTitles && <p className="title">{isNew ? detailsTitle : servicesTitle}</p>}
                </div>
                {!isNew && this.authorisationServices(adminOfCollaboration, collaboration, authorisationGroupName, allServices, sortedServices, sortedServicesBy, reverseServices)}
                {showTitles && <div className="title">
                    <p className="title">{membersTitle}</p>
                </div>}
                {!isNew && this.authorisationMembers(adminOfCollaboration, collaboration, authorisationGroupName, allMembers, sortedMembers, sortedMembersBy, reverseMembers)}
                {<div className="title">
                    <p className="title">{detailsTitle}</p>
                </div>}
                {this.authorisationGroupDetails(adminOfCollaboration, name, alreadyExists, initial, description, uri, status, isNew, disabledSubmit, authorisationGroup)}
            </div>);
    };

}

export default AuthorisationGroup;