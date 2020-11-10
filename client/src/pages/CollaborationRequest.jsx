import React from "react";
import "./CollaborationRequest.scss";
import {
    approveRequestCollaboration,
    collaborationNameExists,
    collaborationRequestById,
    collaborationShortNameExists,
    denyRequestCollaboration,
    myOrganisationsLite
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import SelectField from "../components/SelectField";
import {sanitizeShortName} from "../validations/regExps";
import UnitHeader from "../components/redesign/UnitHeader";
import ImageField from "../components/redesign/ImageField";

class CollaborationRequest extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.goBack()),
            dialogQuestion: I18n.t("collaborationRequest.denyConfirmation"),
            leavePage: true,
            required: ["name", "short_name", "organisation", "logo"],
            collaborationRequest: {organisation: {}, requester: {}},
            approve: true,
            organisations: [],
            alreadyExists: {},
            originalRequestedName: ""
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            this.initState(params.id);
        } else {
            this.props.history.push("/404");
        }
    };

    initState = id =>
        Promise.all([collaborationRequestById(id), myOrganisationsLite()])
            .then(json => {
                const collaborationRequest = json[0];
                const organisations = this.mapOrganisationsToOptions(json[1]);
                collaborationRequest.organisation = organisations.find(org => org.value = collaborationRequest.organisation.id);
                this.setState({
                    collaborationRequest: collaborationRequest,
                    originalRequestedName: collaborationRequest.name, organisations: organisations
                })
            }).catch(e => this.props.history.push("/"));

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        short_name: org.short_name,
    }));

    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.collaborationRequest.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.collaborationRequest.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    reset = e => {
        stopEvent(e);
        this.initState(this.state.collaborationRequest.id)
    };

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            dialogQuestion: I18n.t("confirmationDialog.leavePage"),
            leavePage: true,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({
                    confirmationDialogOpen: false
                },
                () => this.props.history.goBack())
        });
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) ||
            required.some(attr => isEmpty(this.state.collaborationRequest[attr]));
        return !inValid;
    };

    doSubmit = approve => () => {
        if (!approve) {
            this.setState({
                confirmationDialogOpen: true,
                dialogQuestion: I18n.t("collaborationRequest.denyConfirmation"),
                leavePage: false,
                cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
                confirmationDialogAction: () => this.setState({confirmationDialogOpen: false},
                    () => {
                        denyRequestCollaboration(this.state.collaborationRequest.id).then(r => {
                            this.props.history.push(`/organisations/${this.state.collaborationRequest.organisation_id}`);
                            setFlash(I18n.t("collaborationRequest.flash.denied", {name: this.state.collaborationRequest.name}));
                        });
                    })
            });
        } else if (this.isValid()) {
            const {collaborationRequest} = this.state;
            collaborationRequest.organisation_id = collaborationRequest.organisation.value;
            debugger;
            approveRequestCollaboration(collaborationRequest).then(res => {
                this.props.history.push(`/organisations/${collaborationRequest.organisation_id}`);
                setFlash(I18n.t("collaborationRequest.flash.approved", {name: collaborationRequest.name}));
            });
        }
    };

    submit = approve => () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit(approve))
        } else {
            this.doSubmit(approve)();
        }
    };

    updateState = attributeName => e => {
        const {collaborationRequest, alreadyExists} = this.state;
        const value = attributeName === "short_name" ? sanitizeShortName(e.target.value) : e.target.value;
        const newState = {...collaborationRequest, [attributeName]: value};
        this.setState({collaborationRequest: newState, alreadyExists: {...alreadyExists, [attributeName]: false}});
    };

    render() {
        const {
            collaborationRequest, initial, alreadyExists, confirmationDialogOpen, confirmationDialogAction,
            cancelDialogAction, leavePage, organisations, dialogQuestion, originalRequestedName, logo
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-collaboration-request-container">
                <div className="mod-collaboration-request">
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        confirm={confirmationDialogAction}
                                        question={dialogQuestion}
                                        leavePage={leavePage}/>
                    <UnitHeader obj={{
                        ...collaborationRequest, name: I18n.t("collaborationRequest.title", {
                            requester: collaborationRequest.requester.name,
                            name: originalRequestedName
                        })
                    }}/>

                    <div className="collaboration-request">
                        <InputField
                            value={collaborationRequest.message}
                            name={I18n.t("collaboration.motivation")}
                            disabled={true}/>

                        <InputField value={collaborationRequest.name}
                                    onChange={this.updateState("name")}
                                    placeholder={I18n.t("collaboration.namePlaceHolder")}
                                    onBlur={this.validateCollaborationName}
                                    name={I18n.t("collaboration.name")}/>
                        {alreadyExists.name && <span
                            className="error">{I18n.t("collaboration.alreadyExists", {
                            attribute: I18n.t("collaboration.name").toLowerCase(),
                            value: collaborationRequest.name,
                            organisation: collaborationRequest.organisation.label
                        })}</span>}
                        {(!initial && isEmpty(collaborationRequest.name)) && <span
                            className="error">{I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.name").toLowerCase()
                        })}</span>}

                        <ImageField name="logo"
                                    onChange={this.updateState("logo")}
                                    initial={initial}
                                    title={I18n.t("collaboration.logo")}
                                    value={collaborationRequest.logo}
                                    secondRow={false}/>

                        <InputField value={collaborationRequest.short_name}
                                    onChange={this.updateState("short_name")}
                                    placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                    onBlur={this.validateCollaborationShortName}
                                    toolTip={I18n.t("collaboration.shortNameTooltip")}
                                    name={I18n.t("collaboration.shortName")}/>
                        {alreadyExists.short_name && <span
                            className="error">{I18n.t("collaboration.alreadyExists", {
                            attribute: I18n.t("collaboration.shortName").toLowerCase(),
                            value: collaborationRequest.short_name,
                            organisation: collaborationRequest.organisation.label
                        })}</span>}
                        {(!initial && isEmpty(collaborationRequest.short_name)) && <span
                            className="error">{I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.shortName").toLowerCase()
                        })}</span>}

                        <InputField
                            value={`${collaborationRequest.organisation.short_name}:${collaborationRequest.short_name}`}
                            name={I18n.t("collaboration.globalUrn")}
                            copyClipBoard={true}
                            toolTip={I18n.t("collaboration.globalUrnTooltip")}
                            disabled={true}/>

                        <InputField value={collaborationRequest.description}
                                    onChange={this.updateState("description")}
                                    placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                                    name={I18n.t("collaboration.description")}/>

                        <InputField value={collaborationRequest.accepted_user_policy}
                                    onChange={this.updateState("accepted_user_policy")}
                                    placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                    name={I18n.t("collaboration.accepted_user_policy")}/>

                        <SelectField value={collaborationRequest.organisation}
                                     options={organisations}
                                     disabled={true}
                                     name={I18n.t("collaboration.organisation_name")}
                                     placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                     toolTip={I18n.t("collaboration.organisationTooltip")}
                        />
                        <section className="actions">
                            <Button cancelButton={true} txt={I18n.t("collaborationRequest.deny")}
                                    onClick={this.submit(false)}/>
                            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                            <Button cancelButton={true} txt={I18n.t("forms.reset")} onClick={this.reset}/>
                            <Button disabled={disabledSubmit}
                                    txt={I18n.t("collaborationRequest.approve")}
                                    onClick={this.submit(true)}/>
                        </section>
                    </div>
                </div>
            </div>);
    };
}

export default CollaborationRequest;