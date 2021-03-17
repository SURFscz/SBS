import React from "react";
import "./CollaborationRequest.scss";
import {
    approveRequestCollaboration,
    collaborationNameExists,
    collaborationRequestById,
    collaborationShortNameExists,
    deleteRequestCollaboration,
    denyRequestCollaboration,
    myOrganisationsLite
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import SelectField from "../components/SelectField";
import {sanitizeShortName} from "../validations/regExps";
import {AppStore} from "../stores/AppStore";
import CroppedImageField from "../components/redesign/CroppedImageField";
import SpinnerField from "../components/redesign/SpinnerField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

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
            warning: false,
            declineDialog: false,
            rejectionReason: "",
            originalRequestedName: "",
            loading: true
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
                    originalRequestedName: collaborationRequest.name,
                    organisations: organisations,
                    loading: false
                });
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")},
                        {
                            path: `/organisations/${collaborationRequest.organisation.value}`,
                            value: I18n.t("breadcrumb.organisation", {name: collaborationRequest.organisation.label})
                        },
                        {path: "/", value: I18n.t("breadcrumb.collaborationRequest", {name: collaborationRequest.name})}
                    ];
                });
            }).catch(e => this.props.history.push("/"));

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        short_name: org.short_name,
    }));

    validateCollaborationName = e =>
        collaborationNameExists(sanitizeShortName(e.target.value), this.state.collaborationRequest.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.collaborationRequest.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    deleteCollaborationRequest = () => {
        this.setState({
            confirmationDialogOpen: true,
            dialogQuestion: I18n.t("collaborationRequest.deleteConfirmation"),
            leavePage: false,
            warning: true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false, loading: true},
                () => {
                    deleteRequestCollaboration(this.state.collaborationRequest.id).then(() => {
                        this.props.history.push(`/organisations/${this.state.collaborationRequest.organisation_id}/collaboration_requests`);
                        setFlash(I18n.t("collaborationRequest.flash.deleted", {name: this.state.collaborationRequest.name}));
                    });
                })
        });

    }

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
                warning: true,
                declineDialog: true,
                cancelDialogAction: () => this.setState({
                    confirmationDialogOpen: false,
                    declineDialog: false,
                    rejectionReason: "",
                    warning: false
                }),
                confirmationDialogAction: () => this.setState({confirmationDialogOpen: false, loading: true},
                    () => {
                        const {collaborationRequest, rejectionReason} = this.state;
                        denyRequestCollaboration(collaborationRequest.id, rejectionReason).then(() => {
                            this.props.history.push(`/organisations/${this.state.collaborationRequest.organisation_id}/collaboration_requests`);
                            setFlash(I18n.t("collaborationRequest.flash.denied", {name: this.state.collaborationRequest.name}));
                        });
                    })
            });
        } else if (this.isValid()) {
            const {collaborationRequest} = this.state;
            collaborationRequest.organisation_id = collaborationRequest.organisation.value;
            this.setState({loading: true});
            approveRequestCollaboration(collaborationRequest).then(res => {
                this.props.history.push(`/organisations/${collaborationRequest.organisation_id}/collaboration_requests`);
                setFlash(I18n.t("collaborationRequest.flash.approved", {name: collaborationRequest.name}));
            });
        }
    };

    submit = approve => () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit(approve));
        } else {
            this.doSubmit(approve)();
        }
    };

    updateLogo = logo => {
        const {collaborationRequest} = this.state;
        const newState = {...collaborationRequest, logo};
        this.setState({collaborationRequest: newState});
    };

    updateState = attributeName => e => {
        const {collaborationRequest, alreadyExists} = this.state;
        const value = attributeName === "short_name" ? sanitizeShortName(e.target.value) : e.target.value;
        const newState = {...collaborationRequest, [attributeName]: value};
        this.setState({collaborationRequest: newState, alreadyExists: {...alreadyExists, [attributeName]: false}});
    };

    getDeclineRejectionOptions = rejectionReason => {
        return (
            <div className="rejection-reason-container">
                <label htmlFor="rejection-reason">{I18n.t("joinRequest.rejectionReason")}</label>
                <InputField value={rejectionReason}
                            multiline={true}
                            onChange={e => this.setState({rejectionReason: e.target.value})}/>
                <span className="rejection-reason-disclaimer">{I18n.t("joinRequest.rejectionReasonNote")}</span>
            </div>
        );
    }

    render() {
        const {
            collaborationRequest,
            initial,
            alreadyExists,
            confirmationDialogOpen,
            confirmationDialogAction,
            cancelDialogAction,
            leavePage,
            organisations,
            dialogQuestion,
            loading,
            warning,
            declineDialog,
            rejectionReason
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const isOpen = collaborationRequest.status === "open";
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-collaboration-request-container">
                <div className="collaboration-request-header-container">
                    <div className="collaboration-request-header">
                        <div className="left">
                            <h1>{I18n.t("collaborationRequest.request", {id: collaborationRequest.id})}</h1>
                            <div className="header-attributes">
                                <div className="header-keys">
                                    <span className="name">{I18n.t("collaborationRequest.requester")}</span>
                                    <span className="name">{I18n.t("collaboration.motivation")}</span>
                                    {collaborationRequest.status === "denied" &&
                                        <span className="name rejection-reason">{I18n.t("collaborationRequest.rejectionReason")}</span>}
                                </div>
                                <div className="header-values">
                                    <span>{collaborationRequest.requester.name}</span>
                                    <span className="email"><a
                                        href={`mailto:${collaborationRequest.requester.email}`}>{collaborationRequest.requester.email}</a></span>
                                    <span>{collaborationRequest.message}</span>
                                    {collaborationRequest.status === "denied" &&
                                        <span className="rejection-reason">{collaborationRequest.rejection_reason}</span>}
                                </div>
                            </div>
                        </div>

                        <section className="collaboration-request-header-actions">
                            <div className="request-header-actions">
                                {isOpen && <Button cancelButton={true} txt={I18n.t("collaborationRequest.deny")}
                                                   onClick={this.submit(false)}/>}
                                {isOpen && <Button disabled={disabledSubmit}
                                                   txt={I18n.t("collaborationRequest.approve")}
                                                   onClick={this.submit(true)}/>}
                                {!isOpen && <span
                                    className={`status ${collaborationRequest.status}`}>{I18n.t(`collaborationRequest.statuses.${collaborationRequest.status}`)}</span>}
                            </div>
                        </section>
                    </div>
                </div>
                <div className="mod-collaboration-request">
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        confirm={confirmationDialogAction}
                                        question={dialogQuestion}
                                        isWarning={warning}
                                        disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                        leavePage={leavePage}>
                        {declineDialog && this.getDeclineRejectionOptions(rejectionReason)}
                    </ConfirmationDialog>

                    <div className="collaboration-request">

                        <h1 className="section-separator">{I18n.t("collaboration.about")}</h1>

                        <InputField value={collaborationRequest.name}
                                    onChange={this.updateState("name")}
                                    disabled={!isOpen}
                                    error={alreadyExists.name || (!initial && isEmpty(collaborationRequest.name))}
                                    placeholder={I18n.t("collaboration.namePlaceHolder")}
                                    onBlur={this.validateCollaborationName}
                                    name={I18n.t("collaboration.name")}/>
                        {alreadyExists.name && <ErrorIndicator msg={I18n.t("collaboration.alreadyExists", {
                            attribute: I18n.t("collaboration.name").toLowerCase(),
                            value: collaborationRequest.name,
                            organisation: collaborationRequest.organisation.label
                        })}/>}
                        {(!initial && isEmpty(collaborationRequest.name)) &&
                        <ErrorIndicator msg={I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.name").toLowerCase()
                        })}/>}
                        <CroppedImageField name="logo"
                                           onChange={this.updateLogo}
                                           isNew={false}
                                           disabled={!isOpen}
                                           title={I18n.t("collaboration.logo")}
                                           value={collaborationRequest.logo}
                                           initial={initial}
                                           secondRow={true}/>

                        <InputField value={collaborationRequest.short_name}
                                    onChange={this.updateState("short_name")}
                                    placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                    onBlur={this.validateCollaborationShortName}
                                    disabled={!isOpen}
                                    error={alreadyExists.short_name || (!initial && isEmpty(collaborationRequest.short_name))}
                                    toolTip={I18n.t("collaboration.shortNameTooltip")}
                                    name={I18n.t("collaboration.shortName")}/>
                        {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("collaboration.alreadyExists", {
                            attribute: I18n.t("collaboration.shortName").toLowerCase(),
                            value: collaborationRequest.short_name,
                            organisation: collaborationRequest.organisation.label
                        })}/>}
                        {(!initial && isEmpty(collaborationRequest.short_name)) &&
                        <ErrorIndicator msg={I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.shortName").toLowerCase()
                        })}/>}
                        <InputField
                            value={`${collaborationRequest.organisation.short_name}:${collaborationRequest.short_name}`}
                            name={I18n.t("collaboration.globalUrn")}
                            copyClipBoard={true}
                            toolTip={I18n.t("collaboration.globalUrnTooltip")}
                            disabled={true}/>

                        <InputField value={collaborationRequest.description}
                                    onChange={this.updateState("description")}
                                    placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                                    disabled={!isOpen}
                                    name={I18n.t("collaboration.description")}/>

                        <InputField value={collaborationRequest.accepted_user_policy}
                                    onChange={this.updateState("accepted_user_policy")}
                                    placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                    disabled={!isOpen}
                                    name={I18n.t("collaboration.accepted_user_policy")}/>

                        <SelectField value={collaborationRequest.organisation}
                                     options={organisations}
                                     disabled={true}
                                     name={I18n.t("collaboration.organisation_name")}
                                     placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                     toolTip={I18n.t("collaboration.organisationTooltip")}
                        />
                        <section className="actions">
                            {collaborationRequest.status !== "open" &&
                            <Button warningButton={true} onClick={this.deleteCollaborationRequest}/>}
                        </section>
                    </div>
                </div>
            </div>);
    };
}

export default CollaborationRequest;