import React from "react";
import "./CollaborationForm.scss";

import {
    collaborationById,
    collaborationNameExists,
    collaborationShortNameExists,
    createCollaboration,
    deleteCollaboration,
    myOrganisationsLite,
    organisationsByUserSchacHomeOrganisation,
    requestCollaboration,
    tagsByOrganisation,
    updateCollaboration
} from "../api";
import I18n from "../locale/I18n";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {sanitizeShortName, sanitizeTagName, validUrlRegExp} from "../validations/regExps";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";
import CheckBox from "../components/CheckBox";
import UnitHeader from "../components/redesign/UnitHeader";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/redesign/SpinnerField";
import CroppedImageField from "../components/redesign/CroppedImageField";
import EmailField from "../components/EmailField";
import {isUserAllowed, ROLES} from "../utils/UserRole";
import ErrorIndicator from "../components/redesign/ErrorIndicator";
import DateField from "../components/DateField";
import moment from "moment";
import DOMPurify from "dompurify";

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
            expiry_date: null,
            disclose_email_information: true,
            disclose_member_information: true,
            allow_join_requests: true,
            required: ["name", "description", "short_name", "organisation", "logo"],
            alreadyExists: {},
            organisation: {},
            organisations: [],
            invalidInputs: {},
            tags: [],
            tagsSelected: [],
            isNew: true,
            collaboration: null,
            confirmationQuestion: "",
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
            useOrganisationLogo: false,
            generateLogo: false,
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
                const expiryDate = collaboration.expiry_date ? moment(collaboration.expiry_date * 1000).toDate() : null;
                const tagOptions = collaboration.tags.map(tag => ({label: tag.tag_value, value: tag.id}));
                this.setState({
                    ...collaboration,
                    collaboration: collaboration,
                    organisation: orgOption,
                    organisations: [orgOption],
                    tags: tagOptions,
                    tagsSelected: tagOptions,
                    isNew: false,
                    loading: false,
                    expiry_date: expiryDate
                }, () => this.updateTags(organisation.id));
            });
        } else {
            myOrganisationsLite().then(json => {
                if (json.length === 0) {
                    organisationsByUserSchacHomeOrganisation().then(json => {
                        if (isEmpty(json)) {
                            this.updateBreadCrumb(null, null, false, false);
                            this.setState({noOrganisations: true, loading: false});
                        } else {
                            this.updateTags(json.id);
                            const organisations = this.mapOrganisationsToOptions(json);
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
                    }, () => this.updateTags(organisation.value));
                }
            });
        }
    };

    updateTags = organisationId => {
        const {user} = this.props;
        const accessAllowedToOrg = isUserAllowed(ROLES.ORG_MANAGER, user, organisationId);
        if (accessAllowedToOrg) {
            tagsByOrganisation(organisationId).then(existingTags => {
                const tagOptions = existingTags.map(tag => ({label: tag.tag_value, value: tag.id}));
                this.setState({tags: tagOptions});
            });
        }
    }

    updateBreadCrumb = (organisation, collaboration, autoCreateCollaborationRequest, isCollaborationRequest) => {
        const paths = [{path: "/", value: I18n.t("breadcrumb.home")}];
        const {user} = this.props;
        const accessAllowedToOrg = organisation && isUserAllowed(ROLES.ORG_MANAGER, user, organisation.id);
        if (accessAllowedToOrg) {
            paths.push({
                path: `/organisations/${organisation.value}`,
                value: I18n.t("breadcrumb.organisation", {name: organisation.label})
            })
        }
        if (collaboration) {
            paths.push({
                path: `/collaborations/${collaboration.id}`,
                value: I18n.t("breadcrumb.collaboration", {name: collaboration.name}),
            })
            paths.push({path: "/", value: I18n.t("breadcrumb.editCollaboration")})
        } else if (isCollaborationRequest && !autoCreateCollaborationRequest) {
            paths.push({
                path: "/",
                value: I18n.t("breadcrumb.newCollaborationRequest")
            });
        } else {
            paths.push({path: "/", value: I18n.t("breadcrumb.newCollaboration")});
        }
        AppStore.update(s => {
            s.breadcrumb.paths = paths;
        });
    }

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        short_name: org.short_name,
        collaboration_creation_allowed: org.collaboration_creation_allowed,
        logo: org.logo
    }));

    existingCollaborationName = attr => this.state.isNew ? null : this.state.collaboration[attr];

    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.organisation.value, this.existingCollaborationName("name"))
            .then(json => this.setState({alreadyExists: {...this.state.alreadyExists, name: json}}));

    validateCollaborationShortName = e =>
        collaborationShortNameExists(sanitizeShortName(e.target.value), this.state.organisation.value, this.existingCollaborationName("short_name"))
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
            confirmationQuestion: I18n.t("collaborationDetail.deleteConfirmation"),
            confirmationDialogAction: this.doDelete,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            warning: true,
            leavePage: false
        });
    };

    doDelete = () => {
        this.setState({confirmationDialogOpen: false, loading: true});
        const {collaboration} = this.state;
        deleteCollaboration(collaboration.id)
            .then(() => {
                this.props.refreshUser(() => {
                    const {user} = this.props;
                    if (isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id)) {
                        this.props.history.push("/organisations/" + collaboration.organisation.id);
                    } else {
                        this.props.history.push("/home");
                    }
                    setFlash(I18n.t("collaborationDetail.flash.deleted", {name: collaboration.name}));
                });
            });
    };

    isValid = () => {
        const {required, alreadyExists, invalidInputs} = this.state;

        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]);
        return !inValid;
    };

    doSubmit = () => {
        if (this.isValid()) {
            this.setState({loading: true});
            const {
                name,
                short_name,
                description,
                logo,
                website_url,
                administrators,
                message,
                expiry_date,
                tagsSelected,
                organisation,
                isCollaborationRequest,
                allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            } = this.state;
            const promise = isCollaborationRequest ? requestCollaboration : createCollaboration;
            const body = {
                name,
                short_name,
                description,
                logo,
                website_url,
                administrators,
                message,
                expiry_date: expiry_date ? expiry_date.getTime() / 1000 : null,
                organisation_id: organisation.value,
                disable_join_requests: !allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            };
            if (!isCollaborationRequest) {
                body.tags = tagsSelected;
            }
            promise(body).then(res => {
                this.props.refreshUser(() => {
                    const isCollCreated = res.identifier;
                    const path = isCollaborationRequest ? "/home" : `/collaborations/${res.id}`;
                    this.props.history.push(path);
                    setFlash(I18n.t(isCollCreated ? "collaboration.flash.created" : "collaboration.flash.requested", {name: res.name}));
                });
            });
        } else {
            window.scrollTo(0, 0);
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
                name,
                short_name,
                description,
                website_url,
                logo,
                collaboration,
                administrators,
                message,
                tagsSelected,
                expiry_date,
                organisation,
                allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            } = this.state;
            updateCollaboration({
                id: collaboration.id,
                name,
                short_name,
                description,
                website_url,
                tags: tagsSelected,
                logo,
                identifier: collaboration.identifier,
                administrators,
                expiry_date: expiry_date ? expiry_date.getTime() / 1000 : null,
                message,
                organisation_id: organisation.value,
                disable_join_requests: !allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            }).then(() => {
                this.props.history.goBack();
                setFlash(I18n.t("collaborationDetail.flash.updated", {name: name}));
            });
        } else {
            window.scrollTo(0, 0);
        }
    };

    tagValueChanged = value => {
        return sanitizeTagName(value);
    }

    tagsSelectedChanged = selectedOptions => {
        if (selectedOptions === null) {
            this.setState({tagsSelected: []});
        } else {
            const newTagsSelected = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            this.setState({tagsSelected: newTagsSelected});
        }
    }


    removeMail = email => e => {
        stopEvent(e);
        const {administrators} = this.state;
        const newAdministrators = administrators.filter(currentMail => currentMail !== email);
        this.setState({administrators: newAdministrators});
    };

    addEmails = emails => {
        const {administrators} = this.state;
        const uniqueEmails = [...new Set(administrators.concat(emails))];
        this.setState({administrators: uniqueEmails});
    };

    flipCurrentUserAdmin = e => {
        const checked = e.target.checked;
        const {administrators} = this.state;
        const {email} = this.props.user;
        const newAdministrators = checked ? [...administrators, email] :
            administrators.filter(email => email !== this.props.user.email);
        this.setState({administrators: newAdministrators, current_user_admin: checked})
    }

    validateURI = name => e => {
        const uri = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(uri) && !validUrlRegExp.test(uri);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    renderNoOrganisations = user => {
        const msg = user.admin ? I18n.t("home.noOrganisationsPlatformAdmin") :
            user.schac_home_organisation ? I18n.t("home.noOrganisations", {schac_home: user.schac_home_organisation}) : I18n.t("home.noShacHome");
        return (
            <div className="mod-new-collaboration-container">
                <div className="new-collaboration">
                    <h2 className="no-organisations"
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(msg)}}/>
                </div>
            </div>
        )
    };

    regenerateLogo = e => {
        const checked = e.target.checked;
        if (checked) {
            const {name} = this.state;
            const abbreviation = name.split(" ").map(p => p.substring(0, 1).toUpperCase()).join("").substring(0,10);
            const canvas = document.createElement("canvas");
            canvas.width = 480;
            canvas.height = 348;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgb(105,105,105)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgb(0,255,68)";
            const fontSize = 128 + ((11 - abbreviation.length) * 20);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.fillText(abbreviation, canvas.width / 2, canvas.height / 2, canvas.width - 20);
            const dataURL = canvas.toDataURL("image/jpeg")
            this.setState({
                generateLogo: true,
                useOrganisationLogo: false,
                logo: dataURL.substring(dataURL.indexOf(",") + 1)
            });
        } else {
            this.setState({
                generateLogo: false,
                logo: ""
            });
        }

    }

    render() {
        const {
            name,
            short_name,
            description,
            website_url,
            administrators,
            message,
            expiry_date,
            organisation,
            organisations,
            initial,
            alreadyExists,
            confirmationDialogOpen,
            confirmationDialogAction,
            confirmationQuestion,
            cancelDialogAction,
            leavePage,
            noOrganisations,
            isCollaborationRequest,
            disclose_member_information,
            disclose_email_information,
            allow_join_requests,
            current_user_admin,
            logo,
            warning,
            isNew,
            collaboration,
            loading,
            autoCreateCollaborationRequest,
            useOrganisationLogo,
            generateLogo,
            tags,
            tagsSelected,
            invalidInputs,
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user, config} = this.props;
        if (noOrganisations) {
            return this.renderNoOrganisations(user);
        }
        const unitHeaderName = (!isCollaborationRequest || autoCreateCollaborationRequest) ? I18n.t("models.collaborations.new") :
            I18n.t("models.collaborations.newCollaborationRequest")
        const joinRequestUrl = (isNew || !allow_join_requests) ? I18n.t("collaboration.joinRequestUrlDisabled") :
            `${config.base_url}/registration?collaboration=${collaboration.identifier}`;
        const accessAllowedToOrg = organisation && isUserAllowed(ROLES.ORG_MANAGER, user, organisation.id);
        return (
            <div className="mod-new-collaboration-container">
                {isNew &&
                <UnitHeader obj={({name: unitHeaderName, svg: CollaborationsIcon})}/>}
                {!isNew && <UnitHeader obj={collaboration}
                                       name={collaboration.name}
                                       history={user.admin && this.props.history}
                                       mayEdit={false}/>}
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={warning}
                                    question={leavePage ? undefined : confirmationQuestion}
                                    leavePage={leavePage}/>


                <div className="new-collaboration">

                    <h2 className="section-separator">{I18n.t("collaboration.about")}</h2>

                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.namePlaceHolder")}
                                error={alreadyExists.name || (!initial && isEmpty(name))}
                                onBlur={this.validateCollaborationName}
                                name={I18n.t("collaboration.name")}/>
                    {alreadyExists.name && <ErrorIndicator msg={I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.name").toLowerCase(),
                        value: name,
                        organisation: organisation.label
                    })}/>}
                    {(!initial && isEmpty(name)) && <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.name").toLowerCase()
                    })}/>}
                    <div className="cropped-image-container">
                        <CroppedImageField name="logo"
                                           onChange={s => this.setState({logo: s})}
                                           isNew={isNew}
                                           title={I18n.t("collaboration.logo")}
                                           value={logo}
                                           initial={initial}
                                           secondRow={true}/>
                        {isNew && <CheckBox name="use-org-logo" value={useOrganisationLogo}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                if (checked) {
                                                    fetch(organisation.logo).then(res => {
                                                        res.blob().then(content => {
                                                            const reader = new FileReader();
                                                            reader.onload = ({target: {result}}) => {
                                                                this.setState({
                                                                    useOrganisationLogo: !useOrganisationLogo,
                                                                    generateLogo: false,
                                                                    logo: result.substring(result.indexOf(",") + 1)
                                                                });
                                                            };
                                                            reader.readAsDataURL(content);
                                                        })
                                                    });
                                                } else {
                                                    this.setState({
                                                        useOrganisationLogo: !useOrganisationLogo,
                                                        logo: ""
                                                    });
                                                }
                                            }}
                                            info={I18n.t("collaboration.useOrganisationLogo")}/>}
                        {isNew&& <CheckBox name="generate-logo"
                                            value={generateLogo}
                                            onChange={this.regenerateLogo}
                                            tooltip={I18n.t("collaboration.generateLogoTooltip")}
                                            readOnly={isEmpty(name)}
                                            info={I18n.t("collaboration.generateLogo")}/>}
                    </div>
                    <InputField value={short_name} onChange={e => {
                        this.setState({
                            short_name: sanitizeShortName(e.target.value),
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })
                    }}
                                disabled={!isNew && !user.admin}
                                placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                onBlur={this.validateCollaborationShortName}
                                toolTip={I18n.t("collaboration.shortNameTooltip")}
                                error={alreadyExists.short_name || (!initial && isEmpty(short_name))}
                                name={I18n.t("collaboration.shortName")}/>
                    {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase(),
                        value: short_name,
                        organisation: organisation.label
                    })}/>}
                    {(!initial && isEmpty(short_name)) && <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.shortName").toLowerCase()
                    })}/>}
                    <InputField value={`${organisation.short_name}:${short_name}`}
                                name={I18n.t("collaboration.globalUrn")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.globalUrnTooltip")}
                                disabled={true}/>

                    {(!isCollaborationRequest && !isNew) &&
                    <InputField value={joinRequestUrl}
                                name={I18n.t("collaboration.joinRequests")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.joinRequestUrlTooltip")}
                                disabled={true}/>}

                    {(!isCollaborationRequest && !isNew) &&
                    <InputField value={collaboration.identifier}
                                name={I18n.t("collaboration.identifier")}
                                copyClipBoard={true}
                                toolTip={I18n.t("collaboration.identifierTooltip")}
                                disabled={true}/>}

                    <InputField value={description}
                                onChange={e => this.setState({description: e.target.value})}
                                error={alreadyExists.description || (!initial && isEmpty(description))}
                                placeholder={I18n.t("collaboration.descriptionPlaceholder")} multiline={true}
                                name={I18n.t("collaboration.description")}/>
                    {(!initial && isEmpty(description)) && <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.description").toLowerCase()
                    })}/>}

                    <InputField value={website_url}
                                onChange={e => this.setState({website_url: e.target.value})}
                                placeholder={I18n.t("collaboration.websiteUrlPlaceholder")}
                                externalLink={true}
                                name={I18n.t("collaboration.websiteUrl")}
                                onBlur={this.validateURI("website_url")}/>
                    {invalidInputs["website_url"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}

                    {!isCollaborationRequest && <DateField value={expiry_date}
                                                           onChange={e => this.setState({expiry_date: e})}
                                                           allowNull={true}
                                                           pastDatesAllowed={this.props.config.past_dates_allowed}
                                                           showYearDropdown={true}
                                                           name={I18n.t("collaboration.expiryDate")}
                                                           toolTip={I18n.t("collaboration.expiryDateTooltip")}/>}

                    {!isCollaborationRequest && <CheckBox name="allow_join_requests"
                                                          value={allow_join_requests}
                                                          info={I18n.t("collaboration.allowJoinRequests")}
                                                          tooltip={I18n.t("collaboration.allowJoinRequestsTooltip")}
                                                          onChange={() => this.setState({allow_join_requests: !allow_join_requests})}/>}

                    {!isCollaborationRequest && <CheckBox name="disclose_member_information"
                                                          value={disclose_member_information}
                                                          info={I18n.t("collaboration.discloseMemberInformation")}
                                                          tooltip={I18n.t("collaboration.discloseMemberInformationTooltip")}
                                                          onChange={() => this.setState({
                                                              disclose_member_information: !disclose_member_information,
                                                              disclose_email_information: disclose_email_information && !disclose_member_information
                                                          })}/>}

                    {!isCollaborationRequest && <CheckBox name="disclose_email_information"
                                                          value={disclose_member_information && disclose_email_information}
                                                          info={I18n.t("collaboration.discloseEmailInformation")}
                                                          readOnly={!disclose_member_information}
                                                          tooltip={I18n.t("collaboration.discloseEmailInformationTooltip")}
                                                          onChange={() => this.setState({disclose_email_information: !disclose_email_information})}/>}
                    {!isCollaborationRequest && <SelectField value={tagsSelected}
                                                             disabled={!accessAllowedToOrg}
                                                             options={tags
                                                                 .filter(tag => !tagsSelected.find(selectedTag => selectedTag.value === tag.value))}
                                                             creatable={true}
                                                             onInputChange={this.tagValueChanged}
                                                             isMulti={true}
                                                             name={I18n.t("collaboration.tags")}
                                                             placeholder={I18n.t("collaboration.tagsPlaceholder")}
                                                             toolTip={I18n.t("collaboration.tagsTooltip")}
                                                             onChange={this.tagsSelectedChanged}/>}
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
                                         this.updateTags(selectedOption.value);
                                         if (useOrganisationLogo) {
                                             this.setState({logo: selectedOption.logo});
                                         }
                                     })}
                                 searchable={false}
                                 disabled={organisations.length === 1}
                    />
                    {(!initial && isEmpty(organisation)) && <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.organisation_name").toLowerCase()
                    })}/>}
                    {(!isCollaborationRequest && isNew) &&
                    <div>
                        <h2 className="section-separator">{I18n.t("collaboration.invitations")}</h2>

                        <EmailField addEmails={this.addEmails}
                                    removeMail={this.removeMail}
                                    name={I18n.t("invitation.invitees")}
                                    pinnedEmails={current_user_admin ? [this.props.user.email] : []}
                                    isAdmin={true}
                                    emails={administrators}/>
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
                                          error={!initial && isEmpty(message) && isCollaborationRequest}
                                          toolTip={isCollaborationRequest ? I18n.t("collaboration.motivationTooltip") : I18n.t("collaboration.messageTooltip")}
                                          multiline={true}/>}
                    {(!initial && isEmpty(message) && isCollaborationRequest) &&
                    <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.motivation").toLowerCase()
                    })}/>}
                    <section className="actions">
                        {!isNew &&
                        <Button warningButton={true}
                                onClick={this.delete}/>}
                        <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                        <Button disabled={disabledSubmit}
                                txt={(isCollaborationRequest && !autoCreateCollaborationRequest) ? I18n.t("forms.request") : I18n.t("forms.save")}
                                onClick={this.submit}/>
                    </section>
                </div>
            </div>)
    }
}

export default CollaborationForm;