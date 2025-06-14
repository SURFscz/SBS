import React from "react";
import {
    approveServiceRequest,
    createService,
    createServiceRequest,
    deleteServiceRequest,
    denyServiceRequest,
    hintServiceShortName,
    serviceAbbreviationExists,
    serviceEntityIdExists,
    serviceLdapIdentifier,
    serviceNameExists,
    serviceRequestById
} from "../../api";
import {ReactComponent as ServicesIcon} from "../../icons/services.svg";
import I18n from "../../locale/I18n";
import InputField from "../../components/input-field/InputField";
import "./Service.scss";
import Button from "../../components/button/Button";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import {setFlash} from "../../utils/Flash";
import {commaSeparatedArrayToSelectValues, isEmpty, joinSelectValuesArray, stopEvent} from "../../utils/Utils";
import {sanitizeShortName, validEmailRegExp, validUrlRegExp} from "../../validations/regExps";
import CheckBox from "../../components/checkbox/CheckBox";
import {Chip} from "@surfnet/sds";
import UnitHeader from "../../components/redesign/unit-header/UnitHeader";
import {AppStore} from "../../stores/AppStore";
import CroppedImageField from "../../components/redesign/cropped-image-field/CroppedImageField";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import ErrorIndicator from "../../components/redesign/error-indicator/ErrorIndicator";
import EmailField from "../../components/email-field/EmailField";
import {chipTypeForStatus} from "../../utils/UserRole";

class Service extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = this.initialState();
        this.grantOptions = ["authorization_code", "implicit", "refresh_token", "client_credentials"]
            .map(val => ({value: val, label: I18n.t(`service.grants.${val}`)}));
    }

    initialState = () => ({
        service: {},
        serviceRequest: {},
        name: "",
        abbreviation: "",
        abbreviationEdited: false,
        logo: "",
        entity_id: "",
        description: "",
        uri: "",
        uri_info: "",
        accepted_user_policy: "",
        privacy_policy: "",
        automatic_connection_allowed: false,
        access_allowed_for_all: false,
        non_member_users_access_allowed: false,
        allow_restricted_orgs: false,
        ldap_identifier: "",
        token_enabled: false,
        token_validity_days: "",
        pam_web_sso_enabled: false,
        contact_email: "",
        support_email: "",
        security_email: "",
        motivation: "",
        administrators: [],
        message: "",
        required: ["name", "abbreviation", "logo", "security_email", "providing_organisation"],
        alreadyExists: {},
        initial: true,
        invalidInputs: {},
        invalidRedirectUrls: null,
        invalidRedirectUrlHttpNonLocalHost: false,
        confirmationDialogOpen: false,
        leavePage: false,
        confirmationDialogAction: () => true,
        cancelDialogAction: () => true,
        warning: false,
        loading: true,
        isServiceAdmin: false,
        hasAdministrators: false,
        providing_organisation: "",
        comments: "",
        isServiceRequestDetails: false,
        rejectionReason: null,
        declineDialog: false,
        showMetaData: false
    });

    componentDidMount = () => {
        const {user, isServiceRequest, match} = this.props;
        const isServiceRequestDetails = isServiceRequest && match && match.params && match.params.service_request_id;
        if (!isServiceRequest && !user.admin) {
            this.props.history.push("/404");
        } else if (isServiceRequestDetails) {
            serviceRequestById(match.params.service_request_id)
                .then(res => {
                    this.setState({
                        ...res,
                        service: res,
                        serviceRequest: res,
                        isNew: false,
                        isServiceRequestDetails: isServiceRequestDetails,
                        redirect_urls: commaSeparatedArrayToSelectValues(res.redirect_urls),
                        grants: commaSeparatedArrayToSelectValues(res.grants)
                    }, () => {
                        if (res.status === "open") {
                            Promise.all([
                                serviceAbbreviationExists(sanitizeShortName(res.abbreviation), null),
                                serviceNameExists(res.name, null)
                            ]).then(res => {
                                this.setState({
                                    initial: false,
                                    loading: false,
                                    alreadyExists: {...this.state.alreadyExists, abbreviation: res[0], name: res[1]}
                                });
                            })
                        } else {
                            this.setState({loading: false});
                        }
                    });
                    AppStore.update(s => {
                        s.breadcrumb.paths = [{path: "/", value: I18n.t("breadcrumb.home")}, {
                            path: `/home/service_requests`, value: I18n.t("breadcrumb.serviceRequest", {name: res.name})
                        }, {value: I18n.t("home.edit")}];
                    });
                });
        } else {
            this.setState({loading: false});
            if (!isServiceRequest) {
                serviceLdapIdentifier().then(res => this.setState({ldap_identifier: res.ldap_identifier}))
            }
            AppStore.update(s => {
                s.breadcrumb.paths = [{path: "/", value: I18n.t("breadcrumb.home")}, {
                    value: I18n.t("breadcrumb.service", {name: I18n.t(`breadcrumb.${isServiceRequest ? "requestService" : "newService"}`)})
                }];
            });
        }
    };

    generateShortName = name => {
        const {abbreviation, abbreviationEdited} = this.state;
        if ((!abbreviationEdited || isEmpty(abbreviation)) && !isEmpty(name)) {
            hintServiceShortName(name).then(res => this.setState({abbreviation: res.short_name}));
        }
    }

    validateServiceName = e => {
        const name = e.target.value.trim();
        serviceNameExists(name, null).then(json => {
            this.setState({name: name, alreadyExists: {...this.state.alreadyExists, name: json}});
            if (!json && !isEmpty(name) && isEmpty(this.state.abbreviation)) {
                this.generateShortName(name);
            }
        });
    }

    validateServiceEntityId = (e, protocol) => {
        let entityId = e.target.value.trim();
        if (protocol === "oidc") {
            entityId = entityId.replaceAll(":", "@");
        }
        serviceEntityIdExists(entityId, null).then(json => {
            this.setState({entity_id: entityId, alreadyExists: {...this.state.alreadyExists, entity_id: json}});
        });
    }

    validateServiceAbbreviation = e => {
        const shortName = sanitizeShortName(e.target.value.trim());
        serviceAbbreviationExists(shortName, null).then(json => {
            this.setState({abbreviation: shortName, alreadyExists: {...this.state.alreadyExists, abbreviation: json}});
        });
    }

    validateEmail = name => e => {
        const email = e.target.value.trim();
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(email) && !(validEmailRegExp.test(email) || validUrlRegExp.test(email));
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    validateURI = name => e => {
        const uri = e.target.value;
        const {invalidInputs} = this.state;
        const inValid = !isEmpty(uri) && !validUrlRegExp.test(uri);
        this.setState({invalidInputs: {...invalidInputs, [name]: inValid}});
    };

    closeConfirmationDialog = () => this.setState({
        declineDialog: false, rejectionReason: "", confirmationDialogOpen: false
    });

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            warning: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}, () => this.props.history.goBack()),
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    deleteServiceRequest = () => {
        this.setState({
            confirmationDialogOpen: true,
            question: I18n.t("serviceRequest.deleteConfirmation"),
            leavePage: false,
            warning: true,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false, loading: true}, () => {
                deleteServiceRequest(this.state.serviceRequest.id).then(() => {
                    this.props.history.push(`/home/service_requests?refresh=true`);
                    setFlash(I18n.t("serviceRequest.flash.deleted", {name: this.state.serviceRequest.name}));
                });
            })
        });

    }

    getDeclineRejectionOptions = rejectionReason => {
        return (<div className="rejection-reason-container">
            <label htmlFor="rejection-reason">{I18n.t("joinRequest.rejectionReason")}</label>
            <InputField value={rejectionReason}
                        multiline={true}
                        onChange={e => this.setState({rejectionReason: e.target.value})}/>
            <span className="rejection-reason-disclaimer">{I18n.t("joinRequest.rejectionReasonNote")}</span>
        </div>);
    }

    approve = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doApprove)
        } else {
            this.doApprove();
        }
    };

    doApprove = () => {
        if (this.isValid()) {
            const {serviceRequest, redirect_urls, grants} = this.state;
            this.setState({loading: true});
            const joinedRedirectUrls = joinSelectValuesArray(redirect_urls);
            const joinedGrants = joinSelectValuesArray(grants);

            approveServiceRequest({
                ...serviceRequest,
                ...this.state,
                redirect_urls: joinedRedirectUrls,
                grants: joinedGrants,
                token_validity_days: null
            }).then(() => {
                this.props.history.push(`/home/service_requests?refresh=true`);
                setFlash(I18n.t("serviceRequest.flash.approved", {name: serviceRequest.name}));
            });
        } else {
            window.scrollTo(0, 0);
        }
    }

    deny = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            warning: true,
            declineDialog: true,
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDeny,
            question: I18n.t("serviceRequest.denyConfirmation", {name: this.state.service.name})
        });
    };

    doDeny = () => {
        const {serviceRequest, rejectionReason} = this.state;
        denyServiceRequest(serviceRequest.id, rejectionReason).then(() => {
            this.props.history.push(`/home/service_requests?refresh=true`);
            setFlash(I18n.t("serviceRequest.flash.denied", {name: serviceRequest.name}));
        });

    }

    isValid = () => {
        const {
            required,
            alreadyExists,
            invalidInputs,
            contact_email,
            hasAdministrators,
        } = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr])) || Object.keys(invalidInputs).some(key => invalidInputs[key]);
        const {user, isServiceRequest} = this.props;
        const isAdmin = user.admin;
        const contactEmailRequired = (isAdmin && !hasAdministrators && isEmpty(contact_email)) || (isEmpty(contact_email) && isServiceRequest);
        return !inValid && !contactEmailRequired;
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
            this.setState({loading: true});
            const {name, redirect_urls, grants} = this.state;
            const {isServiceRequest} = this.props;
            const joinedRedirectUrls = joinSelectValuesArray(redirect_urls);
            const joinedGrants = joinSelectValuesArray(grants);
            this.setState({redirect_urls: joinedRedirectUrls, grants: joinedGrants}, () => {
                if (isServiceRequest) {
                    createServiceRequest(this.state)
                        .then(res => this.afterUpdate(name, res, isServiceRequest))
                        .catch(() => this.setState({loading: false}));
                } else {
                    createService(this.state)
                        .then(res => this.afterUpdate(name, res, isServiceRequest))
                        .catch(() => this.setState({loading: false}));

                }
            });
        } else {
            window.scrollTo(0, 0);
        }
    };

    afterUpdate = (name, res, isServiceRequest) => {
        setFlash(
            I18n.t(`service.flash.${isServiceRequest ? "createdServiceRequest" : "created"}`, {name: name}),
            null, null, null, isServiceRequest ? 42 : null);
        this.props.history.push(isServiceRequest ? "/home/service_requests?refresh=true" : "/services/" + res.id);
    };

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

    serviceDetailTab = (title, name, isAdmin, alreadyExists, initial, abbreviation, entity_id, description, uri,
                        automatic_connection_allowed, access_allowed_for_all, non_member_users_access_allowed,
                        contact_email, support_email, security_email, invalidInputs, contactEmailRequired,
                        accepted_user_policy, uri_info, privacy_policy, service, disabledSubmit, allow_restricted_orgs,
                        token_enabled, pam_web_sso_enabled, token_validity_days, config, administrators,
                        message, logo, isServiceAdmin, providing_organisation, comments, isServiceRequestDetails,
                        disableEverything) => {
        const {isServiceRequest} = this.props;
        return (<div className="service">

            <h2 className="section-separator">{I18n.t("service.about")}</h2>
            <div className="first-column">
                <InputField value={name}
                            onChange={e => this.setState({
                                name: e.target.value, alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            placeholder={I18n.t("service.namePlaceHolder")}
                            onBlur={this.validateServiceName}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            name={I18n.t("service.name")}
                            disabled={disableEverything}
                            required={true}
                />
                {alreadyExists.name && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.name").toLowerCase(), value: name
                })}/>}
                {(!initial && isEmpty(name)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.name").toLowerCase()
                })}/>}
            </div>
            <CroppedImageField name="logo"
                               onChange={s => this.setState({logo: s})}
                               isNew={true}
                               title={I18n.t("service.logo")}
                               value={logo}
                               disabled={disableEverything}
                               initial={initial}
                               secondRow={true}/>
            <div className="first-column">

                <InputField value={abbreviation}
                            onChange={e => {
                                const abbreviationEdited = this.state.abbreviation !== e.target.value;
                                this.setState({
                                    abbreviation: sanitizeShortName(e.target.value),
                                    abbreviationEdited: abbreviationEdited,
                                    alreadyExists: {...this.state.alreadyExists, abbreviation: false}
                                })
                            }}
                            placeholder={I18n.t("service.abbreviationPlaceHolder")}
                            onBlur={this.validateServiceAbbreviation}
                            name={I18n.t("service.abbreviation")}
                            disabled={disableEverything}
                            toolTip={I18n.t("service.abbreviationTooltip")}
                            error={alreadyExists.abbreviation || (!initial && isEmpty(abbreviation))}
                            copyClipBoard={false}
                            required={true}
                />
                {alreadyExists.abbreviation && <ErrorIndicator msg={I18n.t("service.alreadyExists", {
                    attribute: I18n.t("service.abbreviation").toLowerCase(), value: abbreviation
                })}/>}
                {(!initial && isEmpty(abbreviation)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.abbreviation").toLowerCase()
                })}/>}
            </div>
            <InputField value={description}
                        name={I18n.t("service.description")}
                        disabled={disableEverything}
                        placeholder={I18n.t("service.descriptionPlaceholder")}
                        onChange={e => this.setState({description: e.target.value})}
                        multiline={true}
            />

            <div className="first-column">
                <InputField value={providing_organisation}
                            name={I18n.t("service.providingOrganisation")}
                            disabled={disableEverything}
                            placeholder={I18n.t("service.providingOrganisationPlaceholder")}
                            onChange={e => this.setState({providing_organisation: e.target.value})}
                            error={!initial && isEmpty(providing_organisation)}
                            required={true}
                />
                {(!initial && isEmpty(providing_organisation)) && <ErrorIndicator msg={I18n.t("service.required", {
                    attribute: I18n.t("service.providingOrganisation").toLowerCase()
                })}/>}
            </div>

            {!isServiceRequest && <>
                <h2 className="section-separator">{I18n.t("service.connectionDetails")}</h2>
                <div className="first-column">

                    <InputField value={uri}
                                name={I18n.t("service.uri")}
                                placeholder={I18n.t("service.uriPlaceholder")}
                                onChange={e => this.setState({
                                    uri: e.target.value, invalidInputs: {...invalidInputs, uri: false}
                                })}
                                disabled={disableEverything}
                                toolTip={I18n.t("service.uriTooltip")}
                                externalLink={true}
                                onBlur={this.validateURI("uri")}
                    />
                    {invalidInputs["uri"] && <ErrorIndicator
                        msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
                </div>

                <CheckBox name="automatic_connection_allowed" value={automatic_connection_allowed}
                          info={I18n.t("service.automaticConnectionAllowed")}
                          tooltip={I18n.t("service.automaticConnectionAllowedTooltip")}
                          onChange={e => this.setState({automatic_connection_allowed: e.target.checked})}/>

                <CheckBox name="access_allowed_for_all" value={access_allowed_for_all}
                          info={I18n.t("service.accessAllowedForAll")}
                          tooltip={I18n.t("service.accessAllowedForAllTooltip")}
                          onChange={e => this.setState({access_allowed_for_all: e.target.checked})}/>

                <CheckBox name="non_member_users_access_allowed" value={non_member_users_access_allowed}
                          info={I18n.t("service.nonMemberUsersAccessAllowed")}
                          tooltip={I18n.t("service.nonMemberUsersAccessAllowedTooltip")}
                          onChange={e => this.setState({non_member_users_access_allowed: e.target.checked})}/>

                <CheckBox name="allow_restricted_orgs" value={allow_restricted_orgs}
                          info={I18n.t("service.allowRestrictedOrgs")}
                          tooltip={I18n.t("service.allowRestrictedOrgsTooltip")}
                          onChange={e => this.setState({allow_restricted_orgs: e.target.checked})}/>
            </>}

            <h2 className="section-separator">{I18n.t("service.contactSupport")}</h2>
            <div className="first-column">

                <InputField value={uri_info}
                            name={I18n.t("service.infoUri")}
                            placeholder={I18n.t("service.infoUriPlaceholder")}
                            onChange={e => this.setState({
                                uri_info: e.target.value, invalidInputs: {...invalidInputs, uri_info: false}
                            })}
                            toolTip={I18n.t("service.infoUriTooltip")}
                            disabled={disableEverything}
                            externalLink={true}
                            onBlur={this.validateURI("uri_info")}
                />
                {invalidInputs["uri_info"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
            </div>
            <div className="second-column">

                <InputField value={contact_email}
                            name={I18n.t("service.contact_email")}
                            placeholder={I18n.t("service.contact_emailPlaceholder")}
                            onChange={e => this.setState({
                                contact_email: e.target.value,
                                invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                    ...invalidInputs, email: false
                                }
                            })}
                            toolTip={I18n.t("service.contact_emailTooltip")}
                            disabled={disableEverything}
                            error={invalidInputs["email"] || (!initial && contactEmailRequired)}
                            onBlur={this.validateEmail("email")}
                            externalLink={validUrlRegExp.test(contact_email)}
                            classNamePostFix={"second-column"}
                            required={true}
                />
                {invalidInputs["email"] && <ErrorIndicator
                    msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.email")})}/>}
                {(!initial && contactEmailRequired && !isServiceRequest) &&
                    <ErrorIndicator msg={I18n.t("service.contactEmailRequired")}/>}
                {(!initial && contactEmailRequired && isServiceRequest) && <ErrorIndicator
                    msg={I18n.t("service.required", {attribute: I18n.t("service.contact_email").toLowerCase()})}/>}
            </div>
            <div className="first-column">

                <InputField value={security_email}
                            name={I18n.t("service.security_email")}
                            placeholder={I18n.t("service.security_emailPlaceholder")}
                            onChange={e => this.setState({
                                security_email: e.target.value,
                                invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                    ...invalidInputs, security_email: false
                                }
                            })}
                            toolTip={I18n.t("service.security_emailTooltip")}
                            disabled={disableEverything}
                            error={(!initial && isEmpty(security_email)) || invalidInputs["security_email"]}
                            onBlur={this.validateEmail("security_email")}
                            externalLink={validUrlRegExp.test(security_email)}
                            required={true}
                />

                {invalidInputs["security_email"] && <ErrorIndicator
                    msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.email")})}/>}

                {(!initial && isEmpty(security_email)) &&
                    <ErrorIndicator msg={I18n.t("service.securityEmailRequired")}/>}
            </div>
            <div className="second-column">

                <InputField value={support_email}
                            name={I18n.t("service.support_email")}
                            placeholder={I18n.t("service.support_emailPlaceholder")}
                            onChange={e => this.setState({
                                support_email: e.target.value,
                                invalidInputs: !isEmpty(e.target.value) ? invalidInputs : {
                                    ...invalidInputs, support_email: false
                                }
                            })}
                            toolTip={I18n.t("service.support_emailTooltip")}
                            disabled={disableEverything}
                            error={invalidInputs["support_email"]}
                            onBlur={this.validateEmail("support_email")}
                            externalLink={validUrlRegExp.test(support_email)}
                            classNamePostFix={"second-column"}
                />
                {invalidInputs["support_email"] && <ErrorIndicator
                    msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.contact")})}/>}

            </div>
            <h2 className="section-separator">{I18n.t("service.policies")}</h2>
            <div className="first-column">

                <InputField value={privacy_policy}
                            name={I18n.t("service.privacy_policy")}
                            placeholder={I18n.t("service.privacy_policyPlaceholder")}
                            onChange={e => this.setState({
                                privacy_policy: e.target.value, invalidInputs: {...invalidInputs, privacy_policy: false}
                            })}
                            toolTip={I18n.t("service.privacy_policyTooltip")}
                            disabled={disableEverything}
                            externalLink={true}
                            onBlur={this.validateURI("privacy_policy")}
                />
                {invalidInputs["privacy_policy"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
            </div>
            <div className="second-column">
                <InputField value={accepted_user_policy}
                            name={I18n.t("service.accepted_user_policy")}
                            placeholder={I18n.t("service.accepted_user_policyPlaceholder")}
                            classNamePostFix={"second-column"}
                            onChange={e => this.setState({
                                accepted_user_policy: e.target.value,
                                invalidInputs: {...invalidInputs, accepted_user_policy: false}
                            })}
                            toolTip={I18n.t("service.accepted_user_policyTooltip")}
                            disabled={disableEverything}
                            externalLink={true}
                            onBlur={this.validateURI("accepted_user_policy")}
                />
                {invalidInputs["accepted_user_policy"] &&
                    <ErrorIndicator msg={I18n.t("forms.invalidInput", {name: I18n.t("forms.attributes.uri")})}/>}
            </div>

            {!isServiceRequest && <div className="email-invitations">
                <h2 className="section-separator first last">{I18n.t("service.invitations")}</h2>

                <EmailField addEmails={this.addEmails}
                            removeMail={this.removeMail}
                            name={I18n.t("invitation.invitees")}
                            isAdmin={true}
                            emails={administrators}/>
            </div>}
            {!isServiceRequest && <InputField value={message}
                                              onChange={e => this.setState({message: e.target.value})}
                                              placeholder={I18n.t("collaboration.messagePlaceholder")}
                                              name={I18n.t("collaboration.message")}
                                              toolTip={I18n.t("collaboration.messageTooltip")}
                                              multiline={true}/>}
            {isServiceRequest && <h2 className="section-separator first">{I18n.t("service.commentsHeader")}</h2>}
            {isServiceRequest && <div className="first-column">
                <InputField value={comments}
                            onChange={e => this.setState({comments: e.target.value})}
                            placeholder={I18n.t("service.commentsPlaceholder")}
                            name={I18n.t("service.comments")}
                            toolTip={I18n.t("service.commentsTooltip")}
                            disabled={disableEverything}
                            multiline={true}/>
            </div>}

            <section className="actions">
                {!isServiceRequestDetails && <Button cancelButton={true}
                                                     txt={I18n.t("forms.cancel")}
                                                     onClick={() => this.cancel()}/>}
                {!isServiceRequestDetails && <Button disabled={disabledSubmit}
                                                     txt={I18n.t(`service.${!isServiceRequest ? "add" : "request"}`)}
                                                     onClick={() => this.submit()}/>}
                {(isServiceRequestDetails && this.state.serviceRequest.status !== "open") &&
                    <Button warningButton={true} onClick={this.deleteServiceRequest}/>}
            </section>
        </div>)
    }

    renderHeader = (serviceRequest, disabledSubmit) => {
        const isOpen = serviceRequest.status === "open";
        return (<div className="service-request-header-container">
                <div className="service-request-header">
                    <div className="left">
                        <h2>{I18n.t("serviceRequest.request", {id: serviceRequest.id})}</h2>
                        <div className="header-attributes">
                            <div className="header-keys">
                                <span className="name">{I18n.t("serviceRequest.requester")}</span>
                                <span className="name">{I18n.t("collaboration.motivation")}</span>
                                {serviceRequest.status === "denied" && <span
                                    className="name rejection-reason">{I18n.t("serviceRequest.rejectionReason")}</span>}
                            </div>
                            <div className="header-values">
                                <span>{serviceRequest.requester.name}</span>
                                <span className="email"><a
                                    href={`mailto:${serviceRequest.requester.email}`}>{serviceRequest.requester.email}</a></span>
                                <span>{serviceRequest.comments}</span>
                                {serviceRequest.status === "denied" &&
                                    <span className="rejection-reason">{serviceRequest.rejection_reason}</span>}
                            </div>
                        </div>
                    </div>

                    <section className="service-request-header-actions">
                        <div className="request-header-actions">
                            {isOpen && <Button cancelButton={true}
                                               txt={I18n.t("serviceRequest.deny")}
                                               onClick={() => this.deny()}/>}
                            {isOpen && <Button disabled={disabledSubmit}
                                               txt={I18n.t("serviceRequest.approve")}
                                               onClick={() => this.approve()}/>}
                            {!isOpen && <Chip label={I18n.t(`serviceRequest.statuses.${serviceRequest.status}`)}
                                              type={chipTypeForStatus(serviceRequest)}/>}
                        </div>
                    </section>
                </div>
            </div>

        );
    }

    render() {
        const {
            alreadyExists,
            service,
            initial,
            confirmationDialogOpen,
            cancelDialogAction,
            name,
            abbreviation,
            entity_id,
            description,
            uri,
            uri_info,
            isServiceRequestDetails,
            accepted_user_policy,
            privacy_policy,
            contact_email,
            support_email,
            security_email,
            confirmationDialogAction,
            question,
            leavePage,
            invalidInputs,
            automatic_connection_allowed,
            access_allowed_for_all,
            non_member_users_access_allowed,
            allow_restricted_orgs,
            token_enabled,
            pam_web_sso_enabled,
            token_validity_days,
            administrators,
            message,
            isServiceAdmin,
            logo,
            warning,
            loading,
            hasAdministrators,
            providing_organisation,
            comments,
            serviceRequest,
            declineDialog,
            rejectionReason
        } = this.state;
        const {isServiceRequest} = this.props;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = !initial && !this.isValid();
        const {user, config} = this.props;
        const isAdmin = user.admin;
        const title = isServiceRequest ? I18n.t("service.titleRequest") : I18n.t("service.titleNew");
        const contactEmailRequired = !hasAdministrators && isEmpty(contact_email);
        const disableEverything = isServiceRequest && (serviceRequest.status === "approved" || serviceRequest.status === "denied");
        return (<>
            {!isServiceRequestDetails && <UnitHeader obj={({
                name: I18n.t(`models.services.${isServiceRequest ? "request" : "new"}`), svg: ServicesIcon
            })}/>}
            {isServiceRequestDetails && this.renderHeader(serviceRequest, disabledSubmit)}
            <div className="mod-service">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    isWarning={warning}
                                    disabledConfirm={declineDialog && isEmpty(rejectionReason)}
                                    question={question}>
                    {declineDialog && this.getDeclineRejectionOptions(rejectionReason)}
                </ConfirmationDialog>
                {this.serviceDetailTab(title, name, isAdmin, alreadyExists, initial, abbreviation, entity_id, description,
                    uri, automatic_connection_allowed, access_allowed_for_all, non_member_users_access_allowed, contact_email,
                    support_email, security_email, invalidInputs, contactEmailRequired, accepted_user_policy, uri_info,
                    privacy_policy, service, disabledSubmit, allow_restricted_orgs, token_enabled, pam_web_sso_enabled,
                    token_validity_days, config, administrators, message, logo, isServiceAdmin, providing_organisation,
                    comments, isServiceRequestDetails, disableEverything)}
            </div>
        </>);
    }

}

export default Service;
