import React from "react";
import {
    authorisationGroupById,
    authorisationGroupNameExists,
    collaborationServices,
    createAuthorisationGroup,
    deleteAuthorisationGroup,
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
        if (params.id && params.collaboration_id) {
            if (params.id !== "new") {
                Promise.all([collaborationServices(params.collaboration_id), authorisationGroupById(params.id, params.collaboration_id)])
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
                            back: `/collaboration-authorisation-groups/${params.collaboration_id}`
                        })
                    });
            } else {
                collaborationServices(params.collaboration_id, true)
                    .then(collaboration => {
                        const {sortedMembersBy, reverseMembers} = this.state;
                        const allServices = this.sortedCollaborationServices(collaboration);
                        const allMembers = this.sortedCollaborationMembers(collaboration);
                        this.setState({
                            collaboration: collaboration,
                            collaboration_id: collaboration.id,
                            allServices: allServices,
                            allMembers: allMembers,
                            back: `/collaboration-authorisation-groups/${params.collaboration_id}`
                        })
                    });
            }
        } else {
            this.props.history.push("/404");
        }
    };

    sortedCollaborationMembers = collaboration => collaboration.collaboration_memberships
        .sort((a, b) => a.user.name.localeCompare(b.user.name))
        .map(member => ({
            value: member.id,
            label: this.memberToOption(member)
        }));

    sortedCollaborationServices = collaboration => collaboration.services
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

    authorisationGroupDetails = (name, alreadyExists, initial, description, uri, status, isNew, disabledSubmit) => {
        return (
            <div className="authorisation-group">
                <InputField value={name} onChange={e => this.setState({
                    name: e.target.value,
                    alreadyExists: {...this.state.alreadyExists, name: false}
                })}
                            placeholder={I18n.t("authorisationGroup.namePlaceholder")}
                            onBlur={this.validateAuthorisationGroupName}
                            name={I18n.t("authorisationGroup.name")}/>
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
                            onChange={e => this.setState({description: e.target.value})}/>

                <InputField value={uri}
                            name={I18n.t("authorisationGroup.uri")}
                            placeholder={I18n.t("authorisationGroup.uriPlaceholder")}
                            onChange={e => this.setState({uri: e.target.value})}/>

                <SelectField value={this.statusOptions.find(option => status === option.value)}
                             options={this.statusOptions}
                             name={I18n.t("authorisationGroup.status")}
                             clearable={true}
                             placeholder={I18n.t("authorisationGroup.statusPlaceholder")}
                             onChange={selectedOption => this.setState({status: selectedOption ? selectedOption.value : null})}
                />

                {isNew &&
                <section className="actions">
                    <Button disabled={disabledSubmit} txt={I18n.t("service.add")}
                            onClick={this.submit}/>
                    <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                </section>}
                {!isNew &&
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
            allCollaborationServices, sortedServices, sortedServicesBy, reverseServices,
            allCollaborationMembers, sortedCollaborationMembers, sortedMembersBy, reverseMembers
        } = this.state;
        if (!collaboration) {
            return null;
        }
        const disabledSubmit = !initial && !this.isValid();
        const title = isNew ? I18n.t("authorisationGroup.titleNew") : I18n.t("authorisationGroup.titleUpdate", {name: authorisationGroup.name});
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
                        {I18n.t("authorisationGroup.backToCollaborationAuthorisationGroups", {name: collaboration.name})}
                    </a>
                    <p className="title">{title}</p>
                </div>
                {this.authorisationGroupDetails(name, alreadyExists, initial, description, uri, status, isNew, disabledSubmit)}
            </div>);
    };

}

export default AuthorisationGroup;