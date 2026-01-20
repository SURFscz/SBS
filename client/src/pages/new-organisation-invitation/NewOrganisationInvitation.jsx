import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {
    organisationById,
    organisationInvitationExists,
    organisationInvitations,
    organisationInvitationsPreview
} from "../../api";
import I18n from "../../locale/I18n";
import InputField from "../../components/input-field/InputField";
import Button from "../../components/button/Button";
import {isEmpty, splitListSemantically, stopEvent} from "../../utils/Utils";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import {setFlash} from "../../utils/Flash";
import {validEmailRegExp} from "../../validations/regExps";
import "./NewOrganisationInvitation.scss"
import DateField from "../../components/date-field/DateField";
import {getParameterByName} from "../../utils/QueryParameters";
import SelectField from "../../components/select-field/SelectField";
import {organisationRoles} from "../../forms/constants";
import UnitHeader from "../../components/redesign/unit-header/UnitHeader";
import {AppStore} from "../../stores/AppStore";
import SpinnerField from "../../components/redesign/spinner-field/SpinnerField";
import EmailField from "../../components/email-field/EmailField";
import ErrorIndicator from "../../components/redesign/error-indicator/ErrorIndicator";
import {InvitationsUnits} from "../../components/invitation-units/InvitationsUnits";
import {isUserAllowed, ROLES} from "../../utils/UserRole";

class NewOrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];
        this.intendedRolesOptions = organisationRoles
            .map(role => ({
                value: role,
                label: I18n.t(`organisation.organisationRoles.${role}`)
            }));
        this.state = {
            organisation: undefined,
            administrators: administrators,
            fileName: null,
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            intended_role: "manager",
            message: "",
            isManager: false,
            units: [],
            userUnits: [],
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/organisations/${this.props.match.params.organisation_id}`)),
            leavePage: true,
            activeTab: "invitation_form",
            htmlPreview: "",
            loading: true,
            existingInvitations: [],
            validating: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const organisationIdString = params.organisation_id;
        if (!isEmpty(organisationIdString)) {
            const organisationId = parseInt(organisationIdString, 10);
            organisationById(organisationId)
                .then(json => {
                    const {user} = this.props;
                    const isManager = !isUserAllowed(ROLES.ORG_ADMIN, user, organisationId, null);
                    let userUnits = [];
                    if (isManager) {
                        this.intendedRolesOptions = this.intendedRolesOptions.filter(option => option.value !== "admin");
                        if (!isEmpty(json.units)) {
                            userUnits = user.organisation_memberships.find(om => om.organisation_id === json.id).units;
                        }
                    }
                    this.setState({
                        organisation: json,
                        loading: false,
                        isManager: isManager,
                        units: userUnits,
                        userUnits: userUnits
                    });
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {
                                path: `/organisations/${json.id}`,
                                value: I18n.t("breadcrumb.organisation", {name: json.name})
                            },
                            {path: "/", value: I18n.t("breadcrumb.organisationInvite")}
                        ];
                    });
                });
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {administrators, fileEmails, validating, existingInvitations, isManager, userUnits, units} = this.state;
        const  inValidUnits = isManager && !isEmpty(userUnits) && isEmpty(units);
        return (!isEmpty(administrators) || !isEmpty(fileEmails)) && !validating && isEmpty(existingInvitations) && !inValidUnits;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, organisation, expiry_date, fileEmails, intended_role, units} = this.state;
            this.setState({loading: true});
            organisationInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role,
                units: units,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(() => {
                this.props.history.push(`/organisations/${organisation.id}/admins`);
                setFlash(I18n.t("organisationInvitation.flash.created", {name: organisation.name}))
            });
        } else {
            window.scrollTo(0, 0);
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
        this.validateDuplicates(newAdministrators);
        this.setState({administrators: newAdministrators});
    };

    addEmails = emails => {
        const {administrators} = this.state;
        const uniqueEmails = [...new Set(administrators.concat(emails))];
        this.validateDuplicates(uniqueEmails);
        this.setState({administrators: uniqueEmails});
    };

    validateDuplicates(newAdministrators) {
        const organisationId = this.props.match.params.organisation_id;
        this.setState({validating: true});
        organisationInvitationExists(newAdministrators, organisationId)
            .then(existingInvitations =>
                this.setState({
                    existingInvitations: existingInvitations,
                    initial: isEmpty(existingInvitations),
                    validating: false
                })
            );
    }

    tabChanged = activeTab => {
        this.setState({activeTab: activeTab});
        if (activeTab === "invitation_preview") {
            this.setState({loading: true});
            const {administrators, message, organisation, expiry_date, fileEmails, intended_role} = this.state;
            organisationInvitationsPreview({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                organisation_id: organisation.id
            }).then(res => {
                const htmlPreview = res.html.replace(/class="button" href/g, "nope");
                this.setState({htmlPreview: htmlPreview, loading: false});
            });
        }
    };

    invitationForm = (organisation, message, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date,
                      disabledSubmit, intended_role, units, existingInvitations, isManager, userUnits) => {
        return (
            <div className={"invitation-form"}>
                <EmailField addEmails={this.addEmails}
                            removeMail={this.removeMail}
                            name={I18n.t("invitation.invitees")}
                            error={!initial && isEmpty(administrators)}
                            emails={administrators}
                            autoFocus={true}/>

                {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) && <ErrorIndicator
                    msg={I18n.t("organisationInvitation.requiredAdministrator")}/>}

                {!isEmpty(existingInvitations) && <ErrorIndicator
                    msg={I18n.t(`invitation.${existingInvitations.length === 1 ? "existingInvitation" : "existingInvitations"}`,
                        {emails: splitListSemantically(existingInvitations, I18n.t("service.compliancySeparator"))})}/>}

                <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                             options={this.intendedRolesOptions}
                             small={true}
                             name={I18n.t("invitation.intendedRoleOrganisation")}
                             toolTip={I18n.t("invitation.intendedRoleTooltipOrganisation")}
                             placeholder={I18n.t("collaboration.selectRole")}
                             onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>

                {(!isEmpty(organisation.units) && intended_role === "manager") &&
                    <InvitationsUnits allUnits={(isManager && !isEmpty(userUnits)) ? userUnits : organisation.units}
                                      selectedUnits={units}
                                      isManager={isManager}
                                      userUnits={userUnits}
                                      setUnits={newUnits => this.setState({units: newUnits})}/>}
                  {(!initial && isManager && !isEmpty(userUnits) && isEmpty(units)) && <ErrorIndicator
                    msg={I18n.t("organisationInvitation.requiredUserUnit")}/>}

                <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                            placeholder={I18n.t("organisation.messagePlaceholder")}
                            name={I18n.t("organisation.message")}
                            toolTip={I18n.t("organisation.messageTooltip")}
                            large={true}
                            multiline={true}/>

                <DateField value={expiry_date}
                           onChange={e => this.setState({expiry_date: e})}
                           pastDatesAllowed={this.props.config.past_dates_allowed}
                           maxDate={moment().add(31, "day").toDate()}
                           name={I18n.t("organisationInvitation.expiryDate")}
                           toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

                {this.renderActions(disabledSubmit)}
            </div>
        );
    }
    renderActions = disabledSubmit => (
        <section className="actions">
            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")}
                    onClick={this.submit}/>
        </section>
    );

    render() {
        const {
            initial, administrators, expiry_date, organisation,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName,
            fileTypeError, fileEmails, fileInputKey, intended_role, loading, units, existingInvitations, isManager,
            userUnits
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = (!initial && !this.isValid());
        return (
            <>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <UnitHeader obj={organisation}
                            name={organisation.name}/>
                <div className="mod-new-organisation-invitation">
                    <h2>{I18n.t("tabs.invitation_form")}</h2>
                    <div className="new-organisation-invitation">
                        {this.invitationForm(organisation, message, fileInputKey, fileName, fileTypeError, fileEmails, initial,
                            administrators, expiry_date, disabledSubmit, intended_role, units, existingInvitations, isManager, userUnits)}
                    </div>
                </div>
            </>);
    }

}

export default NewOrganisationInvitation;
