import React from "react";
import "./CollaborationForm.scss";
import {
    collaborationById,
    collaborationNameExists,
    collaborationShortNameExists,
    createCollaboration,
    deleteCollaboration,
    myOrganisationsLite,
    organisationByUserSchacHomeOrganisation,
    requestCollaboration,
    updateCollaboration
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {sanitizeShortName, validEmailRegExp} from "../validations/regExps";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";
import CheckBox from "../components/CheckBox";
import UnitHeader from "../components/redesign/UnitHeader";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/redesign/SpinnerField";
import CroppedImageField from "../components/redesign/CroppedImageField";

class CollaborationForm extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            name: "",
            logo: "",
            short_name: "",
            description: "",
            website_url: "",
            administrators: [],
            message: "",
            email: "",
            accepted_user_policy: "",
            services_restricted: false,
            disclose_email_information: true,
            disclose_member_information: true,
            disable_join_requests: false,
            required: ["name", "short_name", "organisation", "logo"],
            alreadyExists: {},
            organisation: {},
            organisations: [],
            isNew: true,
            collaboration: null,
            initial: true,
            confirmationDialogOpen: false,
            warning: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            leavePage: true,
            noOrganisations: false,
            isCollaborationRequest: false,
            autoCreateCollaborationRequest: false,
            current_user_admin: false,
            loading: true
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            collaborationById(params.id).then(collaboration => {
                const organisation = collaboration.organisation;
                const orgOption = {
                    label: organisation.name,
                    value: organisation.id,
                    short_name: organisation.short_name
                };
                this.updateBreadCrumb(orgOption, collaboration, false, false);
                this.setState({
                    ...collaboration,
                    collaboration: collaboration,
                    organisation: orgOption,
                    organisations: [orgOption],
                    isNew: false,
                    loading: false
                });
            });
        } else {
            myOrganisationsLite().then(json => {
                if (json.length === 0) {
                    organisationByUserSchacHomeOrganisation().then(json => {
                        if (isEmpty(json)) {
                            this.setState({noOrganisations: true, loading: false});
                        } else {
                            const organisations = this.mapOrganisationsToOptions([json]);
                            const organisationId = getParameterByName("organisationId", window.location.search);
                            const organisation = organisations.find(org => org.value === parseInt(organisationId, 10));
                            const autoCreateCollaborationRequest = json.collaboration_creation_allowed || json.collaboration_creation_allowed_entitlement;
                            this.updateBreadCrumb(null, null, autoCreateCollaborationRequest, true);
                            this.setState({
                                organisations: organisations,
                                organisation: organisation || organisations[0],
                                isCollaborationRequest: true,
                                autoCreateCollaborationRequest: autoCreateCollaborationRequest,
                                current_user_admin: true,
                                loading: false,
                                required: this.state.required.concat("message")
                            });
                        }
                    });
                } else {
                    const organisationId = getParameterByName("organisationId", window.location.search);
                    const organisations = this.mapOrganisationsToOptions(json);
                    const organisation = organisations.find(org => org.value === parseInt(organisationId, 10)) || organisations[0];
                    this.updateBreadCrumb(organisation, null, false, false);
                    this.setState({
                        organisations: organisations,
                        organisation: organisation,
                        loading: false
                    });
                }
            });
        }
    };

    updateBreadCrumb = (organisation, collaboration, autoCreateCollaborationRequest, isCollaborationRequest) => {
        const collaborationPath = collaboration ? {
                path: `/organisations/${collaboration.organisation_id}`, value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name}),
            } :
            (isCollaborationRequest && !autoCreateCollaborationRequest) ? {
                    path: "/",
                    value: I18n.t("breadcrumb.newCollaborationRequest")
                } :
                {path: "/", value: I18n.t("breadcrumb.newCollaboration")}
        AppStore.update(s => {
            const paths = [{path: "/", value: I18n.t("breadcrumb.home")}];
            if (organisation) {
                paths.push({path: `/organisations/${organisation.value}`, value: I18n.t("breadcrumb.organisation", {name: organisation.label})});
            }
            paths.push(collaborationPath);
            if (collaboration) {
                paths.push({path: "/", value: I18n.t("breadcrumb.editCollaboration")})
            }
            s.breadcrumb.paths = paths;
        });
    }

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        short_name: org.short_name,
        collaboration_creation_allowed: org.collaboration_creation_allowed
    }));

    existingCollaborationName = attr => this.state.isNew ? null : this.state.collaboration[attr];

    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.organisation.value, this.existingCollaborationName("name"))
            .then(json => this.setState({alreadyExists: {...this.state.alreadyExists, name: json}}));

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.organisation.value, this.existingCollaborationName("short_name"))
            .then(json => this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}}));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            warning: false,
            cancelDialogAction: () => this.props.history.goBack(),
            leavePage: true
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("collaboration.deleteConfirmation"),
            confirmationDialogAction: this.doDelete,
            warning: true,
            leavePage: false
        });
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false, loading: true});
        const {collaboration} = this.state;
        deleteCollaboration(collaboration.id)
            .then(() => {
                this.props.history.push("/organisations/" + collaboration.organisation.id);
                setFlash(I18n.t("collaborationDetail.flash.deleted", {name: collaboration.name}));
            });
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    doSubmit = () => {
        if (this.isValid()) {
            this.setState({loading: true});
            const {
                name, short_name, description, logo, website_url,
                administrators, message, accepted_user_policy, organisation, isCollaborationRequest,
                services_restricted, disable_join_requests, current_user_admin, disclose_member_information, disclose_email_information
            } = this.state;
            const promise = isCollaborationRequest ? requestCollaboration : createCollaboration;
            promise({
                name,
                short_name,
                description,
                logo,
                website_url,
                administrators,
                message,
                accepted_user_policy,
                organisation_id: organisation.value,
                services_restricted,
                disable_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            }).then(res => {
                this.props.refreshUser(() => {
                    this.props.history.goBack();
                    const isCollCreated = res.identifier;
                    setFlash(I18n.t(isCollCreated ? "collaboration.flash.created" : "collaboration.flash.requested", {name: res.name}));
                });
            });
        }
    };

    submit = () => {
        const {initial, isNew} = this.state;
        const action = isNew ? this.doSubmit : this.doUpdate;
        if (initial) {
            this.setState({initial: false}, action)
        } else {
            action()
        }
    };

    doUpdate = () => {
        if (this.isValid()) {
            this.setState({loading: true});
            const {
                name, short_name, description, website_url, logo, collaboration,
                administrators, message, accepted_user_policy, organisation,
                services_restricted, disable_join_requests, current_user_admin, disclose_member_information, disclose_email_information
            } = this.state;
            updateCollaboration({
                id: collaboration.id,
                name,
                short_name,
                description,
                website_url,
                logo,
                identifier: collaboration.identifier,
                administrators,
                message,
                accepted_user_policy,
                organisation_id: organisation.value,
                services_restricted,
                disable_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            }).then(() => {
                this.props.history.goBack();
                setFlash(I18n.t("collaborationDetail.flash.updated", {name: name}));
            });
        }
    };

    removeMail = email => e => {
        stopEvent(e);
        const {administrators} = this.state;
        const newAdministrators = administrators.filter(currentMail => currentMail !== email);
        this.setState({administrators: newAdministrators});
    };

    addEmail = e => {
        const email = e.target.value;
        const {administrators} = this.state;
        const delimiters = [",", " ", ";", "\n", "\t"];
        let emails;
        if (!isEmpty(email) && delimiters.some(delimiter => email.indexOf(delimiter) > -1)) {
            emails = email.replace(/[;\s]/g, ",").split(",").filter(part => part.trim().length > 0 && validEmailRegExp.test(part));
        } else if (!isEmpty(email) && validEmailRegExp.test(email.trim())) {
            emails = [email];
        }
        if (isEmpty(emails)) {
            this.setState({email: ""});
        } else {
            const uniqueEmails = [...new Set(administrators.concat(emails))];
            this.setState({email: "", administrators: uniqueEmails});
        }
    };

    flipCurrentUserAdmin = e => {
        const checked = e.target.checked;
        const {administrators} = this.state;
        const {email} = this.props.user;
        const newAdministrators = checked ? [...administrators, email] :
            administrators.filter(email => email !== this.props.user.email);
        this.setState({administrators: newAdministrators, current_user_admin: checked})
    }

    renderNoOrganisations = user => (
        <div className="mod-new-collaboration-container">
            <div className="mod-new-collaboration">
                <h2 className="no-organisations"
                    dangerouslySetInnerHTML={{__html: I18n.t("home.noOrganisations", {schac_home: user.schac_home_organisation})}}/>
            </div>
        </div>
    );

    render() {
        const {
            name, short_name, description, website_url, administrators, message, accepted_user_policy, organisation,
            organisations, email, initial, alreadyExists, confirmationDialogOpen, confirmationDialogAction, cancelDialogAction,
            leavePage, noOrganisations, isCollaborationRequest, services_restricted, disclose_member_information, disclose_email_information,
            disable_join_requests, current_user_admin, logo, warning, isNew, collaboration, loading, autoCreateCollaborationRequest
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const disabled = false;
        const {user} = this.props;
        if (noOrganisations) {
            return this.renderNoOrganisations(user);
        }
        const unitHeaderName = (!isCollaborationRequest || autoCreateCollaborationRequest) ? I18n.t("models.collaborations.new") :
            I18n.t("models.collaborations.newCollaborationRequest")
        return (
            <div className="mod-new-collaboration-container">
                {isNew &&
                <UnitHeader obj={({name: unitHeaderName, svg: CollaborationsIcon})}/>}
                {!isNew && <UnitHeader obj={collaboration}
                    // auditLogPath={`collaborations/${collaboration.id}`}
                                       name={collaboration.name}
                                       history={user.admin && this.props.history}
                                       mayEdit={false}/>}
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={warning}
                                    question={leavePage ? undefined : I18n.t("organisation.deleteConfirmation")}
                                    leavePage={leavePage}/>


                <div className="new-collaboration">

                    <h1 className="section-separator">{I18n.t("collaboration.about")}</h1>

                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.namePlaceHolder")}
                                onBlur={this.validateCollaborationName}
                                name={I18n.t("collaboration.name")}/>
                    {alreadyExists.name && <span
                        className="error">{I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.name").toLowerCase(),
                        value: name,
                        organisation: organisation.label
                    })}</span>}
                    {(!initial && isEmpty(name)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.name").toLowerCase()
                    })}</span>}

                    <CroppedImageField name="logo" onChange={s => this.setState({logo: s})}
                                       isNew={isNew} title={I18n.t("collaboration.logo")} value={logo}
                                       initial={initial} secondRow={true}/>

                    <InputField value={short_name} onChange={e => {
                        this.setState({
                            short_name: sanitizeShortName(e.target.value),
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                onBlur={this.validateCollaborationShortName}
                                toolTip={I18n.t("collaboration.shortNameTooltip")}
                                name={I18n.t("collaboration.shortName")}/>
                    {alreadyExists.short_name && <span
                        className="error">{I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase(),
                        value: short_name,
                        organisation: organisation.label
                    })}</span>}
                    {(!initial && isEmpty(short_name)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase()
                    })}</span>}

                    <InputField value={`${organisation.short_name}:${short_name}`}
                                name={I18n.t("collaboration.globalUrn")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.globalUrnTooltip")}
                                disabled={true}/>

                    {(!isCollaborationRequest && !isNew) &&
                    <InputField value={collaboration.identifier}
                                name={I18n.t("collaboration.identifier")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.identifierTooltip")}
                                disabled={true}/>}

                    <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                placeholder={I18n.t("collaboration.descriptionPlaceholder")} multiline={true}
                                name={I18n.t("collaboration.description")}/>

                    <InputField value={website_url} onChange={e => this.setState({website_url: e.target.value})}
                                placeholder={I18n.t("collaboration.websiteUrlPlaceholder")}
                                name={I18n.t("collaboration.websiteUrl")}/>

                    <InputField value={accepted_user_policy}
                                onChange={e => this.setState({accepted_user_policy: e.target.value})}
                                placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                name={I18n.t("collaboration.accepted_user_policy")}/>

                    {!isCollaborationRequest && <CheckBox name="disable_join_requests"
                                                          value={disable_join_requests}
                                                          info={I18n.t("collaboration.disableJoinRequests")}
                                                          tooltip={I18n.t("collaboration.disableJoinRequestsTooltip")}
                                                          onChange={() => this.setState({disable_join_requests: !disable_join_requests})}/>}

                    {!isCollaborationRequest && <CheckBox name="services_restricted"
                                                          value={services_restricted}
                                                          info={I18n.t("collaboration.servicesRestricted")}
                                                          tooltip={I18n.t("collaboration.servicesRestrictedTooltip")}
                                                          readOnly={!user.admin}
                                                          onChange={() => this.setState({services_restricted: !services_restricted})}/>}

                    {!isCollaborationRequest && <CheckBox name="disclose_member_information"
                                                          value={disclose_member_information}
                                                          info={I18n.t("collaboration.discloseMemberInformation")}
                                                          tooltip={I18n.t("collaboration.discloseMemberInformationTooltip")}
                                                          readOnly={!user.admin}
                                                          onChange={() => this.setState({disclose_member_information: !disclose_member_information})}/>}

                    {!isCollaborationRequest && <CheckBox name="disclose_email_information"
                                                          value={disclose_email_information}
                                                          info={I18n.t("collaboration.discloseEmailInformation")}
                                                          tooltip={I18n.t("collaboration.discloseEmailInformationTooltip")}
                                                          readOnly={!user.admin}
                                                          onChange={() => this.setState({disclose_email_information: !disclose_email_information})}/>}
                    <SelectField value={organisation}
                                 options={organisations}
                                 name={I18n.t("collaboration.organisation_name")}
                                 placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                 toolTip={I18n.t("collaboration.organisationTooltip")}
                                 onChange={selectedOption => this.setState({organisation: selectedOption},
                                     () => {
                                         this.validateCollaborationName({target: {value: this.state.name}});
                                         this.validateCollaborationShortName({target: {value: this.state.short_name}});
                                         this.updateBreadCrumb(selectedOption, null, false, false);
                                     })}
                                 searchable={false}
                                 disabled={organisations.length === 1}
                    />
                    {(!initial && isEmpty(organisation)) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.organisation_name").toLowerCase()
                    })}</span>}
                    {(!isCollaborationRequest && isNew) &&
                    <div>
                        <h1 className="section-separator">{I18n.t("collaboration.invitations")}</h1>

                        <InputField value={email} onChange={e => this.setState({email: e.target.value})}
                                    placeholder={I18n.t("collaboration.administratorsPlaceholder")}
                                    name={I18n.t("collaboration.administrators")}
                                    toolTip={I18n.t("collaboration.administratorsTooltip")}
                                    onBlur={this.addEmail}
                                    onEnter={this.addEmail}/>

                        <section className="email-tags">
                            {administrators.map(mail =>
                                <div key={mail} className="email-tag">
                                    <span>{mail}</span>
                                    {(disabled || mail === this.props.user.email) ?
                                        <span className="disabled"><FontAwesomeIcon icon="envelope"/></span> :
                                        <span onClick={this.removeMail(mail)}><FontAwesomeIcon
                                            icon="times"/></span>}
                                </div>)}
                        </section>
                    </div>}

                    {isNew && <CheckBox name={I18n.t("collaboration.currentUserAdmin")}
                                        value={current_user_admin}
                                        onChange={this.flipCurrentUserAdmin}
                                        readOnly={isCollaborationRequest}
                                        info={I18n.t("collaboration.currentUserAdmin")}
                                        tooltip={I18n.t("collaboration.currentUserAdminTooltip")}/>}

                    {isNew && <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                          placeholder={isCollaborationRequest ? I18n.t("collaboration.motivationPlaceholder") : I18n.t("collaboration.messagePlaceholder")}
                                          name={isCollaborationRequest ? I18n.t("collaboration.motivation") : I18n.t("collaboration.message")}
                                          toolTip={isCollaborationRequest ? I18n.t("collaboration.motivationTooltip") : I18n.t("collaboration.messageTooltip")}
                                          multiline={true}/>}
                    {(!initial && isEmpty(message) && isCollaborationRequest) && <span
                        className="error">{I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.motivation").toLowerCase()
                    })}</span>}

                    <section className="actions">
                        {!isNew &&
                        <Button warningButton={true} txt={I18n.t("collaborationDetail.delete")}
                                onClick={this.delete}/>}
                        <Button disabled={disabledSubmit}
                                txt={(isCollaborationRequest && !autoCreateCollaborationRequest) ? I18n.t("forms.request") : I18n.t("forms.save")}
                                onClick={this.submit}/>
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default CollaborationForm;