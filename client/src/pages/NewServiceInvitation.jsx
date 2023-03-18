import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {serviceById, serviceInvitations} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {validEmailRegExp} from "../validations/regExps";
import "./NewServiceInvitation.scss"
import DateField from "../components/DateField";
import {getParameterByName} from "../utils/QueryParameters";
import SelectField from "../components/SelectField";
import UnitHeader from "../components/redesign/UnitHeader";
import {AppStore} from "../stores/AppStore";
import SpinnerField from "../components/redesign/SpinnerField";
import EmailField from "../components/EmailField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

class NewServiceInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];
        this.intendedRolesOptions = [{
            value: "manager",
            label: I18n.t("serviceDetail.admin")
        }];
        this.state = {
            service: undefined,
            administrators: administrators,
            fileName: null,
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            message: "",
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/services/${this.props.match.params.service_id}`)),
            leavePage: true,
            activeTab: "invitation_form",
            htmlPreview: "",
            loading: true
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
        const {administrators, fileEmails} = this.state;
        return !isEmpty(administrators) || !isEmpty(fileEmails);
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {administrators, message, service, expiry_date, fileEmails} = this.state;
            this.setState({loading: true});
            serviceInvitations({
                administrators: administrators.concat(fileEmails),
                message,
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

    invitationForm = (service, message, fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators, expiry_date,
                      disabledSubmit) =>
        <div className={"invitation-form"}>
            <EmailField addEmails={this.addEmails}
                        removeMail={this.removeMail}
                        name={I18n.t("invitation.invitees")}
                        error={!initial && isEmpty(administrators)}
                        emails={administrators}/>

            {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) && <ErrorIndicator
                msg={I18n.t("organisationInvitation.requiredAdministrator")}/>}

            <SelectField value={this.intendedRolesOptions[0]}
                         options={this.intendedRolesOptions}
                         small={true}
                         disabled={true}
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
            fileTypeError, fileEmails, fileInputKey, intended_role, loading
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
                            administrators, expiry_date, disabledSubmit, intended_role)}
                    </div>
                </div>
            </>);
    }

}

export default NewServiceInvitation;