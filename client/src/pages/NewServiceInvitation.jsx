import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {serviceById, serviceInvitationExists, serviceInvitations} from "../api";
import I18n from "../locale/I18n";
import InputField from "../components/InputField";
import Button from "../components/button/Button";
import {isEmpty, splitListSemantically, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {validEmailRegExp} from "../validations/regExps";
import "./NewServiceInvitation.scss"
import DateField from "../components/DateField";
import {getParameterByName} from "../utils/QueryParameters";
import SelectField from "../components/SelectField";
import UnitHeader from "../components/_redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/_redesign/SpinnerField";
import EmailField from "../components/EmailField";
import ErrorIndicator from "../components/_redesign/ErrorIndicator";
import {serviceRoles} from "../forms/constants";

class NewServiceInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];
        this.intendedRolesOptions = serviceRoles.map(role => ({
            value: role,
            label: I18n.t(`serviceDetail.${role}`)
        }));
        this.state = {
            service: undefined,
            administrators: administrators,
            fileName: null,
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            message: "",
            intended_role: "admin",
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/services/${this.props.match.params.service_id}`)),
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
        if (params.service_id) {
            serviceById(params.service_id)
                .then(json => {
                    this.setState({service: json, loading: false});
                    AppStore.update(s => {
                        s.breadcrumb.paths = [
                            {path: "/", value: I18n.t("breadcrumb.home")},
                            {
                                path: `/services/${json.id}`,
                                value: I18n.t("breadcrumb.service", {name: json.name})
                            },
                            {path: "/", value: I18n.t("breadcrumb.serviceInvite")}
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
        const {administrators, fileEmails, existingInvitations, validating} = this.state;
        return (!isEmpty(administrators) || !isEmpty(fileEmails)) && isEmpty(existingInvitations) && !validating;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, service, expiry_date, fileEmails, intended_role} = this.state;
            this.setState({loading: true});
            serviceInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                service_id: service.id
            }).then(() => {
                this.props.history.push(`/services/${service.id}/admins`);
                setFlash(I18n.t("organisationInvitation.flash.created", {name: service.name}))
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

    validateDuplicates(newAdministrators) {
        const serviceId = this.props.match.params.service_id;
        this.setState({validating: true});
        serviceInvitationExists(newAdministrators, serviceId)
            .then(existingInvitations =>
                this.setState({
                    existingInvitations: existingInvitations,
                    initial: isEmpty(existingInvitations),
                    validating: false
                })
            )
    }

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

    invitationForm = (service, message, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date,
                      disabledSubmit, intended_role, existingInvitations) =>
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
                         onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}
                         toolTip={I18n.t("serviceDetail.intendedRoleTooltip")}
                         name={I18n.t("serviceDetail.intendedRole")}/>

            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("invitation.messagePlaceholder")}
                        name={I18n.t("invitation.message")}
                        toolTip={I18n.t("invitation.messageTooltip")}
                        large={true}
                        multiline={true}/>

            <DateField value={expiry_date}
                       onChange={e => this.setState({expiry_date: e})}
                       pastDatesAllowed={this.props.config.past_dates_allowed}
                       maxDate={moment().add(31, "day").toDate()}
                       name={I18n.t("organisationInvitation.expiryDate")}
                       toolTip={I18n.t("organisationInvitation.expiryDateTooltip")}/>

            {this.renderActions(disabledSubmit)}
        </div>;

    renderActions = disabledSubmit => (
        <section className="actions">
            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.invite")}
                    onClick={this.submit}/>
        </section>
    );

    render() {
        const {
            initial, administrators, expiry_date, service,
            confirmationDialogOpen, confirmationDialogAction, cancelDialogAction, leavePage, message, fileName,
            fileTypeError, fileEmails, fileInputKey, intended_role, loading, existingInvitations
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
                <UnitHeader obj={service}
                            name={service.name}/>
                <div className="mod-new-service-invitation">
                    <h2>{I18n.t("tabs.invitation_form")}</h2>
                    <div className="new-service-invitation">
                        {this.invitationForm(service, message, fileInputKey, fileName, fileTypeError, fileEmails, initial,
                            administrators, expiry_date, disabledSubmit, intended_role, existingInvitations)}
                    </div>
                </div>
            </>);
    }

}

export default NewServiceInvitation;
