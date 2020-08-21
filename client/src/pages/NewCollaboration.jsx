import React from "react";
import "./NewCollaboration.scss";
import {
    collaborationNameExists,
    collaborationShortNameExists,
    createCollaboration,
    myOrganisationsLite,
    organisationByUserSchacHomeOrganisation,
    requestCollaboration
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {sanitizeShortName, validEmailRegExp} from "../validations/regExps";
import {collaborationAccessTypes} from "../forms/constants";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";
import CheckBox from "../components/CheckBox";
import BackLink from "../components/BackLink";

class NewCollaboration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.accessTypeOptions = collaborationAccessTypes.map(type => ({
            value: type,
            label: I18n.t(`accessTypes.${type}`)
        }));
        this.state = {
            name: "",
            short_name: "",
            description: "",
            access_type: this.accessTypeOptions[0].value,
            administrators: [],
            message: "",
            email: "",
            accepted_user_policy: "",
            services_restricted: false,
            disable_join_requests: false,
            enrollment: "",
            status: "",
            required: ["name", "short_name", "organisation"],
            alreadyExists: {},
            organisation: {},
            organisations: [],
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => {
                    this.props.history.goBack();
                }),
            leavePage: true,
            noOrganisations: false,
            isRequestCollaboration: false,
            current_user_admin: false
        };
    }

    componentDidMount = () => {
        myOrganisationsLite().then(json => {
            if (json.length === 0) {
                organisationByUserSchacHomeOrganisation().then(json => {
                    if (json.length === 0) {
                        this.setState({noOrganisations: true});
                    } else {
                        const organisations = this.mapOrganisationsToOptions(json);
                        this.setState({
                            organisations: organisations,
                            organisation: organisations[0],
                            isRequestCollaboration: true,
                            required: this.state.required.concat("message")
                        });
                    }
                });

            } else {
                const organisationId = getParameterByName("organisation", window.location.search);
                const organisations = this.mapOrganisationsToOptions(json);
                let organisation = {};
                if (organisationId) {
                    const filtered = organisations.filter(org => org.value === parseInt(organisationId, 10));
                    if (filtered.length > 0) {
                        organisation = filtered[0];
                    }
                } else {
                    organisation = organisations[0];
                }
                this.setState({
                    organisations: organisations,
                    organisation: organisation
                });
            }
        });
    };

    mapOrganisationsToOptions = organisations => organisations.map(org => ({
        label: org.name,
        value: org.id,
        short_name: org.short_name,
        collaboration_creation_allowed: org.collaboration_creation_allowed
    }));

    validateCollaborationName = e =>
        collaborationNameExists(e.target.value, this.state.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });

    validateCollaborationShortName = e =>
        collaborationShortNameExists(e.target.value, this.state.organisation.value).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {required, alreadyExists, current_user_admin, administrators} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        const requiredAdmin = current_user_admin || administrators.length > 0;
        return !inValid && requiredAdmin;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {
                name, short_name, description, access_type, enrollment,
                administrators, message, accepted_user_policy, organisation, isRequestCollaboration,
                services_restricted, disable_join_requests, current_user_admin
            } = this.state;
            const promise = isRequestCollaboration ? requestCollaboration : createCollaboration;
            promise({
                name, short_name, description, enrollment, access_type,
                administrators, message, accepted_user_policy, organisation_id: organisation.value,
                services_restricted, disable_join_requests, current_user_admin
            }).then(res => {
                this.props.history.goBack();
                const isCollCreated = res.identifier;
                setFlash(I18n.t(isCollCreated ? "collaboration.flash.created" : "collaboration.flash.requested", {name: res.name}));
                this.props.refreshUser();
            });
        }
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
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
        const delimiters = [",", " ", ";"];
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
        const newAdministrators = checked ? [...administrators, this.props.user.email] :
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
            name, short_name, description, administrators, message, accepted_user_policy, organisation, organisations, email, initial, alreadyExists,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, noOrganisations, isRequestCollaboration,
            services_restricted, disable_join_requests, current_user_admin
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const disabled = false;
        const {user} = this.props;
        if (noOrganisations) {
            return this.renderNoOrganisations(user);
        }
        const title = isRequestCollaboration ? I18n.t("collaboration.requestTitle") : I18n.t("collaboration.title");
        return (
            <div className="mod-new-collaboration-container">
                <div className="mod-new-collaboration">
                    <ConfirmationDialog isOpen={confirmationDialogOpen}
                                        cancel={cancelDialogAction}
                                        confirm={confirmationDialogAction}
                                        question={leavePage ? undefined : I18n.t("collaboration.deleteConfirmation")}
                                        leavePage={leavePage}/>
                    <BackLink history={this.props.history}/>
                    <p className="title">{title}</p>
                    <div className="new-collaboration">
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

                        <InputField value={description} onChange={e => this.setState({description: e.target.value})}
                                    placeholder={I18n.t("collaboration.descriptionPlaceholder")}
                                    name={I18n.t("collaboration.description")}/>

                        <InputField value={accepted_user_policy}
                                    onChange={e => this.setState({accepted_user_policy: e.target.value})}
                                    placeholder={I18n.t("collaboration.acceptedUserPolicyPlaceholder")}
                                    name={I18n.t("collaboration.accepted_user_policy")}/>

                        {/*<InputField value={enrollment}*/}
                        {/*            onChange={e => this.setState({enrollment: e.target.value})}*/}
                        {/*            placeholder={I18n.t("collaboration.enrollmentPlaceholder")}*/}
                        {/*            toolTip={I18n.t("collaboration.enrollmentTooltip")}*/}
                        {/*            name={I18n.t("collaboration.enrollment")}/>*/}

                        {/*<SelectField value={this.accessTypeOptions.find(option => option.value === access_type)}*/}
                        {/*             options={this.accessTypeOptions}*/}
                        {/*             name={I18n.t("collaboration.access_type")}*/}
                        {/*             placeholder={I18n.t("collaboration.accessTypePlaceholder")}*/}
                        {/*             onChange={selectedOption => this.setState({access_type: selectedOption ? selectedOption.value : null})}*/}
                        {/*/>*/}
                        {!isRequestCollaboration && <CheckBox name="disable_join_requests"
                                                              value={disable_join_requests}
                                                              info={I18n.t("collaboration.disableJoinRequests")}
                                                              tooltip={I18n.t("collaboration.disableJoinRequestsTooltip")}
                                                              onChange={() => this.setState({disable_join_requests: !disable_join_requests})}/>}

                        {!isRequestCollaboration && <CheckBox name="services_restricted"
                                                              value={services_restricted}
                                                              info={I18n.t("collaboration.servicesRestricted")}
                                                              tooltip={I18n.t("collaboration.servicesRestrictedTooltip")}
                                                              readOnly={!user.admin}
                                                              onChange={() => this.setState({services_restricted: !services_restricted})}/>}

                        <SelectField value={organisation}
                                     options={organisations}
                                     name={I18n.t("collaboration.organisation_name")}
                                     placeholder={I18n.t("collaboration.organisationPlaceholder")}
                                     toolTip={I18n.t("collaboration.organisationTooltip")}
                                     onChange={selectedOption => this.setState({organisation: selectedOption},
                                         () => {
                                             this.validateCollaborationName({target: {value: this.state.name}});
                                             this.validateCollaborationShortName({target: {value: this.state.short_name}});
                                         })}
                                     searchable={true}
                        />
                        {(!initial && isEmpty(organisation)) && <span
                            className="error">{I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.organisation_name").toLowerCase()
                        })}</span>}
                        {!isRequestCollaboration &&
                        <div>
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
                        {(!initial && !current_user_admin && administrators.length === 0) &&
                        <span className="error">{I18n.t("collaboration.oneAdministratorIsRequired")}</span>}

                        <CheckBox name={I18n.t("collaboration.currentUserAdmin")}
                                  value={current_user_admin}
                                  onChange={this.flipCurrentUserAdmin}
                                  info={I18n.t("collaboration.currentUserAdmin")}
                                  tooltip={I18n.t("collaboration.currentUserAdminTooltip")}/>

                        <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                                    placeholder={isRequestCollaboration ? I18n.t("collaboration.motivationPlaceholder"):I18n.t("collaboration.messagePlaceholder")}
                                    name={isRequestCollaboration ? I18n.t("collaboration.motivation") : I18n.t("collaboration.message")}
                                    toolTip={isRequestCollaboration ? I18n.t("collaboration.motivationTooltip") : I18n.t("collaboration.messageTooltip")}
                                    multiline={true}/>
                        {(!initial && isEmpty(message) && isRequestCollaboration) && <span
                            className="error">{I18n.t("collaboration.required", {
                            attribute: I18n.t("collaboration.motivation").toLowerCase()
                        })}</span>}

                        <section className="actions">
                            <Button disabled={disabledSubmit}
                                    txt={isRequestCollaboration ? I18n.t("forms.request") : I18n.t("forms.submit")}
                                    onClick={this.submit}/>
                            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                        </section>
                    </div>
                </div>
            </div>);
    };
}

export default NewCollaboration;