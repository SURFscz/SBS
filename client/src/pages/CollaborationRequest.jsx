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
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import SelectField from "../components/SelectField";

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
            required: ["name", "short_name", "organisation"],
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
            Promise.all([collaborationRequestById(params.id), myOrganisationsLite()])
                .then(json => {
                    const collaborationRequest = json[0];
                    const organisations = this.mapOrganisationsToOptions(json[1]);
                    collaborationRequest.organisation = organisations.find(org => org.value = collaborationRequest.organisation.id);
                    this.setState({collaborationRequest: collaborationRequest,
                        originalRequestedName: collaborationRequest.name, organisations: organisations})
                });
        } else {
            this.props.history.push("/404");
        }
    };

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
                            this.props.history.goBack();
                            setFlash(I18n.t("collaborationRequest.flash.denied", {name: this.state.collaborationRequest.name}));
                        });
                    })
            });
        } else if (this.isValid()) {
            const {collaborationRequest} = this.state;
            collaborationRequest.organisation_id = collaborationRequest.organisation.value;
            approveRequestCollaboration(collaborationRequest).then(res => {
                this.props.history.goBack();
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
        const newState = {...collaborationRequest, [attributeName]: e.target.value};
        this.setState({collaborationRequest: newState, alreadyExists: {...alreadyExists, [attributeName]: false}});
    };

    render() {
        const {
            collaborationRequest, initial, alreadyExists, confirmationDialogOpen, confirmationDialogAction,
            cancelDialogAction, leavePage, organisations, dialogQuestion, originalRequestedName
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
                    <div className="title">
                        <a href="/back" onClick={e => {
                            stopEvent(e);
                            this.props.history.goBack();
                        }}><FontAwesomeIcon icon="arrow-left"/>
                            {I18n.t("forms.back")}
                        </a>
                        <p className="title">{I18n.t("collaborationRequest.title", {
                            requester: collaborationRequest.requester.name,
                            name: originalRequestedName
                        })}</p>
                    </div>

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
                            <Button disabled={disabledSubmit}
                                    txt={I18n.t("collaborationRequest.approve")}
                                    onClick={this.submit(true)}/>
                            <Button className="delete" txt={I18n.t("collaborationRequest.deny")}
                                    onClick={this.submit(false)}/>
                            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                        </section>
                    </div>
                </div>
            </div>);
    };
}

export default CollaborationRequest;