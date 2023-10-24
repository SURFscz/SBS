import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationById, collaborationInvitations, collaborationInvitationsPreview} from "../api";
import I18n from "../locale/I18n";
import InputField from "../components/InputField";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import {validEmailRegExp} from "../validations/regExps";

import "./NewInvitation.scss"
import DateField from "../components/DateField";
import {collaborationRoles} from "../forms/constants";
import SelectField from "../components/SelectField";
import {getParameterByName} from "../utils/QueryParameters";
import {AppStore} from "../stores/AppStore";
import UnitHeader from "../components/redesign/UnitHeader";
import SpinnerField from "../components/redesign/SpinnerField";
import {isUserAllowed, ROLES} from "../utils/UserRole";
import EmailField from "../components/EmailField";
import ErrorIndicator from "../components/redesign/ErrorIndicator";

class NewInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.intendedRolesOptions = collaborationRoles.map(role => ({
            value: role,
            label: I18n.t(`collaboration.${role}`)
        }));
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];

        this.state = {
            collaboration: undefined,
            administrators: administrators,
            groups: [],
            selectedGroup: [],
            fileName: null,
            fileEmails: [],
            fileTypeError: false,
            fileInputKey: new Date().getMilliseconds(),
            intended_role: "member",
            message: "",
            membership_expiry_date: null,
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push(`/collaborations/${this.props.match.params.collaboration_id}`)),
            leavePage: true,
            htmlPreview: "",
            activeTab: "invitation_form",
            loading: true,
            isAdminView: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const collaborationId = params.collaboration_id;
        const isAdminView = getParameterByName("isAdminView", window.location.search) === "true";
        if (collaborationId) {
            collaborationById(collaborationId)
                .then(collaboration => {
                    this.setState({
                        collaboration: collaboration,
                        loading: false,
                        intended_role: isAdminView ? "admin" : "member",
                        isAdminView: isAdminView,
                        groups: collaboration.groups.map(ag => ({value: ag.id, label: ag.name})),
                    });
                    this.updateAppStore(collaboration, this.props.user);
                }).catch(() => this.props.history.push("/"));
        } else {
            this.props.history.push("/404");
        }
    };

    updateAppStore = (collaboration, user) => {
        const orgManager = isUserAllowed(ROLES.ORG_MANAGER, user, collaboration.organisation_id, null);
        AppStore.update(s => {
            s.breadcrumb.paths = orgManager ? [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/organisations/${collaboration.organisation_id}`,
                    value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name})
                },
                {
                    path: `/collaborations/${collaboration.id}`,
                    value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})
                },
                {value: I18n.t("breadcrumb.invite")}
            ] : [
                {path: "/", value: I18n.t("breadcrumb.home")},
                {
                    path: `/collaborations/${collaboration.id}`,
                    value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})
                },
                {value: I18n.t("breadcrumb.invite")}
            ];
        });
    }

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {administrators, fileEmails, intended_role, expiry_date} = this.state;
        return (!isEmpty(administrators) || !isEmpty(fileEmails)) && !isEmpty(intended_role) && !isEmpty(expiry_date);
    };

    doSubmit = () => {
        const {
            administrators, message, collaboration, expiry_date, fileEmails, intended_role,
            selectedGroup, membership_expiry_date, isAdminView
        } = this.state;
        if (this.isValid()) {
            this.setState({loading: true});
            collaborationInvitations({
                administrators: administrators.concat(fileEmails),
                message,
                membership_expiry_date: membership_expiry_date ? membership_expiry_date.getTime() / 1000 : null,
                intended_role: intended_role,
                collaboration_id: collaboration.id,
                groups: selectedGroup.map(ag => ag.value),
                expiry_date: expiry_date.getTime() / 1000
            }).then(() => {
                this.props.history.push(`/collaborations/${collaboration.id}/${isAdminView ? "admins" : "members"}`);
                setFlash(I18n.t("invitation.flash.created", {name: collaboration.name}))
            });
        } else if (isEmpty(administrators)) {
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

    getMembershipExpiryDate = () => {
        const {expiry_date} = this.state;
        if (isEmpty(expiry_date)) {
            return null;
        }
        const membershipExpiryDate = new Date(expiry_date.getTime());
        membershipExpiryDate.setDate(membershipExpiryDate.getDate() + 1);
        return membershipExpiryDate;
    }

    setInvitationExpiryDate = e => {
        const {membership_expiry_date} = this.state;
        this.setState({expiry_date: e}, () => {
            if (membership_expiry_date && e >= membership_expiry_date) {
                this.setState({membership_expiry_date: this.getMembershipExpiryDate()})
            }
        })
    }

    tabChanged = activeTab => {
        this.setState({activeTab: activeTab});
        if (activeTab === "invitation_preview") {
            this.setState({loading: true});
            const {administrators, message, collaboration, intended_role, expiry_date, fileEmails} = this.state;
            collaborationInvitationsPreview({
                administrators: administrators.concat(fileEmails),
                message,
                intended_role: intended_role,
                expiry_date: expiry_date.getTime() / 1000,
                collaboration_id: collaboration.id
            }).then(res => {
                const htmlPreview = res.html.replace(/class="button" href/g, "nope");
                this.setState({htmlPreview: htmlPreview, loading: false});
            });
        }
    };

    preview = disabledSubmit => (
        <div>
            <div className={"preview-mail"} dangerouslySetInnerHTML={{__html: this.state.htmlPreview}}/>
            {this.renderActions(disabledSubmit)}
        </div>
    );

    selectedGroupsChanged = selectedOptions => {
        if (selectedOptions === null) {
            this.setState({selectedGroup: []});
        } else {
            const newSelectedOptions = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            this.setState({selectedGroup: newSelectedOptions});
        }
    }

    invitationForm = (fileInputKey, fileName, fileTypeError, fileEmails, initial, administrators,
                      intended_role, message, expiry_date, disabledSubmit, groups, selectedGroup, membership_expiry_date) =>
        <div className={"invitation-form"}>

            <EmailField addEmails={this.addEmails}
                        removeMail={this.removeMail}
                        name={I18n.t("invitation.invitees")}
                        emails={administrators}
                        error={!initial && isEmpty(administrators) && isEmpty(fileEmails)}/>
            {(!initial && isEmpty(administrators) && isEmpty(fileEmails)) &&
                <ErrorIndicator msg={I18n.t("invitation.requiredEmail")}/>}

            <SelectField value={this.intendedRolesOptions.find(option => option.value === intended_role)}
                         options={this.intendedRolesOptions}
                         name={I18n.t("invitation.intendedRole")}
                         small={true}
                         toolTip={I18n.t("invitation.intendedRoleTooltip")}
                         placeholder={I18n.t("collaboration.selectRole")}
                         onChange={selectedOption => this.setState({intended_role: selectedOption ? selectedOption.value : null})}/>

            <SelectField value={selectedGroup}
                         options={groups
                             .filter(group => !selectedGroup.find(selectedGroup => selectedGroup.value === group.value))}
                         name={I18n.t("invitation.groups")}
                         toolTip={I18n.t("invitation.groupsTooltip")}
                         isMulti={true}
                         placeholder={I18n.t("invitation.groupsPlaceHolder")}
                         onChange={this.selectedGroupsChanged}/>

            <DateField value={membership_expiry_date}
                       onChange={e => this.setState({membership_expiry_date: e})}
                       allowNull={true}
                       showYearDropdown={true}
                       pastDatesAllowed={this.props.config.past_dates_allowed}
                       minDate={this.getMembershipExpiryDate()}
                       name={I18n.t("invitation.membershipExpiryDate")}
                       toolTip={I18n.t("invitation.membershipExpiryDateTooltip")}/>

            <InputField value={message} onChange={e => this.setState({message: e.target.value})}
                        placeholder={I18n.t("invitation.inviteesMessagePlaceholder")}
                        name={I18n.t("collaboration.message")}
                        large={true}
                        toolTip={I18n.t("invitation.inviteesTooltip")}
                        multiline={true}/>

            <DateField value={expiry_date}
                       onChange={this.setInvitationExpiryDate}
                       allowNull={true}
                       pastDatesAllowed={this.props.config.past_dates_allowed}
                       maxDate={moment().add(31, "day").toDate()}
                       name={I18n.t("invitation.expiryDate")}
                       toolTip={I18n.t("invitation.expiryDateTooltip")}/>
            {(!initial && isEmpty(expiry_date)) &&
                <ErrorIndicator msg={I18n.t("invitation.requiredExpiryDate")}/>}

            {this.renderActions(disabledSubmit)}
        </div>;

    renderActions = disabledSubmit => (
        <section className="actions">
            <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
            <Button disabled={disabledSubmit} txt={I18n.t("invitation.invite")}
                    onClick={this.submit}/>
        </section>
    );

    render() {
        const {
            initial,
            administrators,
            expiry_date,
            membership_expiry_date,
            collaboration,
            intended_role,
            confirmationDialogOpen,
            confirmationDialogAction,
            cancelDialogAction,
            leavePage,
            message,
            fileName,
            fileInputKey,
            fileTypeError,
            fileEmails,
            groups,
            selectedGroup,
            loading
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = (!initial && !this.isValid());
        return (
            <>
                <UnitHeader obj={collaboration}
                            name={collaboration.name}/>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}/>
                <div className="mod-new-collaboration-invitation">
                    <h2>{I18n.t("tabs.invitation_form")}</h2>
                    <div className="new-collaboration-invitation">
                        {this.invitationForm(fileInputKey, fileName, fileTypeError, fileEmails, initial,
                            administrators, intended_role, message, expiry_date, disabledSubmit, groups,
                            selectedGroup, membership_expiry_date)}
                    </div>
                </div>
            </>);
    }

}

export default NewInvitation;