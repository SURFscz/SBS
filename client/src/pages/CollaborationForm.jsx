import React from "react";
import "./CollaborationForm.scss";

import {
    allOrganisations,
    collaborationById,
    collaborationNameExists,
    collaborationShortNameExists,
    createCollaboration,
    deleteCollaboration,
    hintCollaborationShortName,
    myOrganisationsLite,
    requestCollaboration,
    tagsByOrganisation,
    updateCollaboration
} from "../api";
import I18n from "../locale/I18n";
import InputField from "../components/InputField";
import Button from "../components/button/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {sanitizeShortName, sanitizeTagName, validEmailRegExp, validUrlRegExp} from "../validations/regExps";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";
import CheckBox from "../components/checkbox/CheckBox";
import UnitHeader from "../components/_redesign/UnitHeader";
import {ReactComponent as CollaborationsIcon} from "../icons/collaborations.svg";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/_redesign/SpinnerField";
import CroppedImageField from "../components/_redesign/CroppedImageField";
import EmailField from "../components/EmailField";
import {isUserAllowed, ROLES} from "../utils/UserRole";
import ErrorIndicator from "../components/_redesign/ErrorIndicator";
import DateField from "../components/DateField";
import moment from "moment";
import DOMPurify from "dompurify";
import OnBoardingMessage from "../components/_redesign/OnBoardingMessage";
import {CollaborationUnits} from "../components/collaborationunits/CollaborationUnits";

class CollaborationForm extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            name: "",
            logo: "",
            short_name: "",
            shortNameEdited: false,
            description: "",
            website_url: "",
            administrators: [],
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
            units: [],
            allUnits: [],
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
            loading: true
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            collaborationById(params.id)
                .then(collaboration => {
                    const {user} = this.props;
                    const organisation = collaboration.organisation;
                    const orgOptions = this.mapOrganisationsToOptions([organisation])
                    this.updateBreadCrumb(orgOptions[0], collaboration, false, false);
                    if (user.admin) {
                        allOrganisations().then(res => {
                            const orgOptions = this.mapOrganisationsToOptions(res);
                            this.setState({organisations: orgOptions});
                        });
                    }
                    const expiryDate = collaboration.expiry_date ? moment(collaboration.expiry_date * 1000).toDate() : null;
                    const tagOptions = collaboration.tags.map(tag => ({label: tag.tag_value, value: tag.id}));
                    this.setState({
                        ...collaboration,
                        collaboration: collaboration,
                        organisation: orgOptions[0],
                        organisations: orgOptions,
                        tags: tagOptions,
                        tagsSelected: tagOptions,
                        isNew: false,
                        loading: false,
                        expiry_date: expiryDate,
                        allow_join_requests: !collaboration.disable_join_requests
                    }, () => {
                        this.updateUnits(organisation, collaboration);
                        this.updateTags(organisation.id);
                    });
                }).catch(() => this.props.history.push("/404"));
        } else {
            myOrganisationsLite().then(json => {
                if (json.length === 0) {
                    const {user} = this.props;
                    if (isEmpty(user.organisations_from_user_schac_home)) {
                        this.updateBreadCrumb(null, null, false, false);
                        this.setState({noOrganisations: true, loading: false});
                    } else {
                        const organisations = this.mapOrganisationsToOptions(user.organisations_from_user_schac_home);
                        const organisationId = getParameterByName("organisationId", window.location.search);
                        const organisation = organisations.find(org => org.value === parseInt(organisationId, 10)) || organisations[0];
                        const autoCreateCollaborationRequest = organisation.collaboration_creation_allowed || organisation.collaboration_creation_allowed_entitlement;
                        this.updateTags(organisation.id);
                        this.updateBreadCrumb(null, null, autoCreateCollaborationRequest, true);
                        this.setState({
                            organisations: organisations,
                            organisation: organisation || organisations[0],
                            isCollaborationRequest: true,
                            autoCreateCollaborationRequest: autoCreateCollaborationRequest,
                            current_user_admin: true,
                            loading: false,
                        }, () => {
                            this.updateUnits(organisation, {units: []});
                        });
                    }
                } else {
                    const {user} = this.props;
                    const organisationId = getParameterByName("organisationId", window.location.search);
                    const organisations = this.mapOrganisationsToOptions(json);
                    const organisationsFromSchacHome = this.mapOrganisationsToOptions(user.organisations_from_user_schac_home || []);
                    const allOrganisations = organisations.concat(organisationsFromSchacHome)
                    const organisation = allOrganisations.find(org => org.value === parseInt(organisationId, 10)) || allOrganisations[0];
                    this.updateBreadCrumb(organisation, null, false, false);
                    this.setState({
                        organisations: allOrganisations,
                        organisation: organisation,
                        loading: false
                    }, () => {
                        this.updateTags(organisation.value);
                        this.updateUnits(organisation, {units: []});
                    });
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

    updateUnits = (organisation, collaboration) => {
        const allUnits = organisation.units.map(unit => ({...unit, label: unit.name, value: unit.id}));
        const units = collaboration.units.map(unit => ({...unit, label: unit.name, value: unit.id}));
        this.setState({allUnits: allUnits, units: units});
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
            paths.push({path: "/", value: I18n.t("home.edit")})
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

    mapOrganisationsToOptions = organisations => organisations
        .map(org => ({
            id: org.id,
            label: org.name,
            name: org.name,
            value: org.id,
            short_name: org.short_name,
            on_boarding_msg: org.on_boarding_msg,
            units: org.units,
            collaboration_creation_allowed: org.collaboration_creation_allowed,
            collaboration_creation_allowed_entitlement: org.collaboration_creation_allowed_entitlement,
            logo: org.logo
        }))
        .sort((opt1, opt2) => opt1.name.toLowerCase().localeCompare(opt2.name.toLowerCase()));

    existingCollaborationName = attr => this.state.isNew ? null : this.state.collaboration[attr];

    validateEmail = (name, allowWebsite = false) => e => {
        const email = e.target.value;
        const {invalidInputs} = this.state;
        const valid = isEmpty(email) || validEmailRegExp.test(email) || (allowWebsite && validUrlRegExp.test(email));
        this.setState({invalidInputs: {...invalidInputs, [name]: !valid}});
    };

    validateCollaborationName = e => {
        const name = e.target.value.trim();
        return collaborationNameExists(name, this.state.organisation.value, this.existingCollaborationName("name"))
            .then(json => {
                this.setState({name: name, alreadyExists: {...this.state.alreadyExists, name: json}});
                if (!json && !isEmpty(name) && isEmpty(this.state.short_name)) {
                    this.generateShortName(name);
                }
            });
    };

    validateCollaborationShortName = e => {
        const shortName = sanitizeShortName(e.target.value.trim());
        collaborationShortNameExists(shortName, this.state.organisation.value, this.existingCollaborationName("short_name"))
            .then(json => this.setState({
                short_name: shortName,
                alreadyExists: {...this.state.alreadyExists, short_name: json}
            }));
    }


    generateShortName = name => {
        const {isNew, short_name, shortNameEdited} = this.state;
        if ((!shortNameEdited || isEmpty(short_name)) && !isEmpty(name) && isNew) {
            hintCollaborationShortName(name).then(res => this.setState({short_name: res.short_name}));
        }
    }

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
        const {required, alreadyExists, invalidInputs, isCollaborationRequest, organisation, units} = this.state;
        const {user} = this.props;
        const unitsRequired = !isCollaborationRequest && organisation && !isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id)
            && !isEmpty((user.organisation_memberships.filter(member => member.organisation_id === organisation.id && member.role === "manager")[0] || {}).units)
            && isEmpty(units);

        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr])) ||
            Object.keys(invalidInputs).some(key => invalidInputs[key]) || unitsRequired;
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
                support_email,
                administrators,
                expiry_date,
                tagsSelected,
                units,
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
                support_email,
                administrators,
                units,
                expiry_date: expiry_date ? expiry_date.getTime() / 1000 : null,
                organisation_id: organisation.value,
                disable_join_requests: !allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            };
            if (!isCollaborationRequest) {
                body.tags = tagsSelected.map(tag => tag.label);
            }
            promise(body)
                .then(res => {
                    this.props.refreshUser(() => {
                        const isCollCreated = res.identifier;
                        const path = isCollaborationRequest ? "/home" : `/collaborations/${res.id}`;
                        this.props.history.push(path);
                        setFlash(I18n.t(isCollCreated ? "collaboration.flash.created" : "collaboration.flash.requested", {name: res.name}));
                    })
                })
                .catch(() => this.setState({loading: false}));
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
                support_email,
                logo,
                collaboration,
                administrators,
                units,
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
                support_email,
                tags: tagsSelected.map(tag => tag.label),
                units,
                logo,
                identifier: collaboration.identifier,
                administrators,
                expiry_date: expiry_date ? expiry_date.getTime() / 1000 : null,
                organisation_id: organisation.value,
                disable_join_requests: !allow_join_requests,
                current_user_admin,
                disclose_member_information,
                disclose_email_information
            })
                .then(() => {
                    this.props.history.goBack();
                    setFlash(I18n.t("collaborationDetail.flash.updated", {name: name}));
                })
                .catch(() => this.setState({loading: false}));
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

    setUnits = newUnits => {
        this.setState({units: newUnits})
    }

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

    render() {
        const {
            name,
            short_name,
            description,
            website_url,
            support_email,
            administrators,
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
            tags,
            tagsSelected,
            invalidInputs,
            units,
            allUnits
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user} = this.props;
        if (noOrganisations) {
            return this.renderNoOrganisations(user);
        }
        const unitHeaderName = (!isCollaborationRequest || autoCreateCollaborationRequest) ? I18n.t("models.collaborations.new") :
            I18n.t("models.collaborations.newCollaborationRequest")
        const accessAllowedToOrg = organisation && isUserAllowed(ROLES.ORG_MANAGER, user, organisation.id);
        const unitsRequired = !isCollaborationRequest && organisation && !isUserAllowed(ROLES.ORG_ADMIN, user, organisation.id)
            && !isEmpty((user.organisation_memberships.filter(member => member.organisation_id === organisation.id && member.role === "manager")[0] || {}).units);
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

                {(isCollaborationRequest && !isEmpty(organisation.on_boarding_msg)) &&
                    <OnBoardingMessage organisation={organisation}/>}
                <div className="new-collaboration">

                    <h2 className="section-separator">{I18n.t("collaboration.about")}</h2>

                    <SelectField value={organisation}
                                 options={organisations}
                                 name={I18n.t("collaboration.organisation_name")}
                                 placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                 toolTip={I18n.t("collaboration.organisationTooltip")}
                                 required={true}
                                 onChange={selectedOption => this.setState({organisation: selectedOption},
                                     () => {
                                         this.validateCollaborationName({target: {value: this.state.name}});
                                         this.validateCollaborationShortName({target: {value: this.state.short_name}});
                                         const autoCreateCo = selectedOption.collaboration_creation_allowed || selectedOption.collaboration_creation_allowed_entitlement;
                                         this.updateBreadCrumb(selectedOption,
                                             this.state.collaboration,
                                             autoCreateCo,
                                             !autoCreateCo);
                                         this.updateTags(selectedOption.value);
                                         this.updateUnits(selectedOption, {units: []});
                                         this.setState({
                                             autoCreateCollaborationRequest: autoCreateCo || isUserAllowed(ROLES.ORG_ADMIN, user, selectedOption.id),
                                             isCollaborationRequest: !autoCreateCo && !isUserAllowed(ROLES.ORG_ADMIN, user, selectedOption.id)
                                         })
                                     })}
                                 searchable={false}
                                 disabled={organisations.length === 1}
                    />

                    <InputField value={name} onChange={e => {
                        this.setState({
                            name: e.target.value,
                            alreadyExists: {...this.state.alreadyExists, name: false}
                        })
                    }}
                                placeholder={I18n.t("collaboration.namePlaceHolder")}
                                error={alreadyExists.name || (!initial && isEmpty(name))}
                                onBlur={this.validateCollaborationName}
                                name={I18n.t("collaboration.name")}
                                required={true}
                    />
                    {alreadyExists.name && <ErrorIndicator msg={I18n.t("collaboration.alreadyExists", {
                        attribute: I18n.t("collaboration.name").toLowerCase(),
                        value: name,
                        organisation: organisation.label
                    })}/>}
                    {(!initial && isEmpty(name)) && <ErrorIndicator msg={I18n.t("collaboration.required", {
                        attribute: I18n.t("collaboration.name").toLowerCase()
                    })}/>}
                    <div className="cropped-image-container large">
                        <CroppedImageField name="logo"
                                           onChange={s => this.setState({logo: s})}
                                           isNew={isNew}
                                           title={I18n.t("collaboration.logo")}
                                           value={logo}
                                           initial={initial}
                                           includeLogoGallery={true}
                                           secondRow={true}/>
                    </div>

                    <InputField value={short_name} onChange={e => {
                        const shortNameEdited = this.state.short_name !== e.target.value;
                        this.setState({
                            short_name: sanitizeShortName(e.target.value),
                            shortNameEdited: shortNameEdited,
                            alreadyExists: {...this.state.alreadyExists, short_name: false}
                        })
                    }}
                                disabled={!isNew && !user.admin}
                                placeholder={I18n.t("collaboration.shortNamePlaceHolder")}
                                onBlur={this.validateCollaborationShortName}
                                toolTip={I18n.t("collaboration.shortNameTooltip")}
                                error={alreadyExists.short_name || (!initial && isEmpty(short_name))}
                                name={I18n.t("collaboration.shortName")}
                                required={true}
                    />
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
                        <InputField value={collaboration.identifier}
                                    name={I18n.t("collaboration.identifier")}
                                    copyClipBoard={true}
                                    toolTip={I18n.t("collaboration.identifierTooltip")}
                                    disabled={true}/>}

                    <InputField value={description}
                                onChange={e => this.setState({description: e.target.value})}
                                error={alreadyExists.description || (!initial && isEmpty(description))}
                                placeholder={I18n.t("collaboration.descriptionPlaceholder")} multiline={true}
                                name={I18n.t("collaboration.description")}
                                required={true}
                    />
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

                    <InputField value={support_email}
                                name={I18n.t("service.support_email")}
                                placeholder={I18n.t("collaboration.support_emailPlaceholder")}
                                onChange={e => this.setState({
                                    support_email: e.target.value,
                                    invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                        ...invalidInputs, support_email: false
                                    }
                                })}
                                toolTip={I18n.t("service.support_emailTooltip")}
                                error={invalidInputs["support_email"]}
                                onBlur={this.validateEmail("support_email", true)}
                                externalLink={validUrlRegExp.test(support_email)}
                                classNamePostFix={"second-column"}
                    />
                    {invalidInputs["support_email"] && <ErrorIndicator
                        msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.contact")})}/>}


                    {!isEmpty(allUnits) &&
                        <CollaborationUnits selectedUnits={units}
                                            allUnits={allUnits}
                                            setUnits={this.setUnits}
                                            user={user}
                                            organisation={organisation}
                                            readOnly={!accessAllowedToOrg && !isCollaborationRequest}
                                            label={I18n.t("units.collaboration")}/>

                    }
                    {(!initial && unitsRequired && isEmpty(units)) &&
                        <ErrorIndicator msg={I18n.t("units.unitRequired")}/>
                    }

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

                    {(isNew && !isCollaborationRequest && isUserAllowed(ROLES.ORG_MANAGER, user)) &&
                        <CheckBox name={I18n.t("collaboration.currentUserAdmin")}
                                  value={current_user_admin}
                                  onChange={this.flipCurrentUserAdmin}
                                  readOnly={isCollaborationRequest}
                                  info={I18n.t("collaboration.currentUserAdmin")}
                                  tooltip={I18n.t("collaboration.currentUserAdminTooltip")}/>}

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
