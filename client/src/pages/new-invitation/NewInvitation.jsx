import React from "react";
import moment from "moment";

import "react-datepicker/dist/react-datepicker.css";

import {collaborationById, collaborationInvitations, invitationExists} from "../../api";
import I18n from "../../locale/I18n";
import InputField from "../../components/input-field/InputField";
import {CopyToClipboard} from "react-copy-to-clipboard";
import Button from "../../components/button/Button";
import {isEmpty, splitListSemantically, stopEvent} from "../../utils/Utils";
import ConfirmationDialog from "../../components/confirmation-dialog/ConfirmationDialog";
import {setFlash} from "../../utils/Flash";
import {validEmailRegExp} from "../../validations/regExps";
import "./NewInvitation.scss"
import DateField from "../../components/date-field/DateField";
import {collaborationRoles} from "../../forms/constants";
import SelectField from "../../components/select-field/SelectField";
import {getParameterByName} from "../../utils/QueryParameters";
import {AppStore} from "../../stores/AppStore";
import UnitHeader from "../../components/_redesign/unit-header/UnitHeader";
import SpinnerField from "../../components/_redesign/spinner-field/SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import EmailField from "../../components/email-field/EmailField";
import ErrorIndicator from "../../components/_redesign/error-indicator/ErrorIndicator";

class NewInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.intendedRolesOptions = collaborationRoles.map(role => ({
            value: role, label: I18n.t(`collaboration.${role}`)
        }));
        const email = getParameterByName("email", window.location.search);
        const administrators = !isEmpty(email) && validEmailRegExp.test(email.trim()) ? [email.trim()] : [];

        this.state = {
            collaboration: undefined,
            administrators: administrators,
            groups: [],
            selectedGroup: [],
            intended_role: "member",
            message: "",
            invitation_sender_name: "",
            membership_expiry_date: null,
            expiry_date: moment().add(16, "days").toDate(),
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}, () => this.props.history.push(`/collaborations/${this.props.match.params.collaboration_id}`)),
            leavePage: true,
            htmlPreview: "",
            activeTab: "invitation_form",
            loading: true,
            isAdminView: false,
            existingInvitations: [],
            validating: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const collaborationId = params.collaboration_id;
        const isAdminView = getParameterByName("isAdminView", window.location.search) === "true";
        if (collaborationId) {
            collaborationById(collaborationId)
                .then(collaboration => {
                    const organisation = collaboration.organisation;
                    const {user} = this.props;
                    this.setState({
                        collaboration: collaboration,
                        loading: false,
                        message: organisation.invitation_message || "",
                        invitation_sender_name: organisation.invitation_sender_name || user.name,
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
            s.breadcrumb.paths = orgManager ? [{path: "/", value: I18n.t("breadcrumb.home")}, {
                path: `/organisations/${collaboration.organisation_id}`,
                value: I18n.t("breadcrumb.organisation", {name: collaboration.organisation.name})
            }, {
                path: `/collaborations/${collaboration.id}`,
                value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})
            }, {value: I18n.t("breadcrumb.invite")}] : [{path: "/", value: I18n.t("breadcrumb.home")}, {
                path: `/collaborations/${collaboration.id}`,
                value: I18n.t("breadcrumb.collaboration", {name: collaboration.name})
            }, {value: I18n.t("breadcrumb.invite")}];
        });
    }

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {administrators, intended_role, expiry_date, existingInvitations, validating} = this.state;
        return !isEmpty(administrators) && !isEmpty(intended_role) && !isEmpty(expiry_date)
            && isEmpty(existingInvitations) && !validating;
    };

    doSubmit = () => {
        const {
            administrators,
            message,
            invitation_sender_name,
            collaboration,
            expiry_date,
            intended_role,
            selectedGroup,
            membership_expiry_date,
            isAdminView
        } = this.state;
        if (this.isValid()) {
            this.setState({loading: true});
            collaborationInvitations({
                administrators: administrators,
                message,
                invitation_sender_name,
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
        this.validateDuplicates(newAdministrators);
        this.setState({administrators: newAdministrators});
    };

    validateDuplicates(newAdministrators) {
        const collaborationId = this.props.match.params.collaboration_id;
        this.setState({validating: true});
        invitationExists(newAdministrators, collaborationId)
            .then(existingInvitations => this.setState({
                existingInvitations: existingInvitations, initial: isEmpty(existingInvitations), validating: false
            }))
    }

    addEmails = emails => {
        const {administrators} = this.state;
        const uniqueEmails = [...new Set(administrators.concat(emails))];
        this.validateDuplicates(uniqueEmails);
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

    selectedGroupsChanged = selectedOptions => {
        if (selectedOptions === null) {
            this.setState({selectedGroup: []});
        } else {
            const newSelectedOptions = Array.isArray(selectedOptions) ? [...selectedOptions] : [selectedOptions];
            this.setState({selectedGroup: newSelectedOptions});
        }
    }

    invitationForm = (initial, administrators, intended_role, message, invitation_sender_name, expiry_date,
                      disabledSubmit, groups, selectedGroup, membership_expiry_date, existingInvitations) => {
        return (
            <div className="new-collaboration-invitation">
                <p>{I18n.t("collaborationInvitations.inviteWithEmailInfo")}</p>
                <div className="invitation-form">
                    <EmailField addEmails={this.addEmails}
                                removeMail={this.removeMail}
                                name={I18n.t("invitation.invitees")}
                                emails={administrators}
                                error={!initial && isEmpty(administrators)}
                                autoFocus={true}/>
                    {(!initial && isEmpty(administrators)) &&
                        <ErrorIndicator msg={I18n.t("invitation.requiredEmail")}/>}

                    {!isEmpty(existingInvitations) && <ErrorIndicator
                        msg={I18n.t(`invitation.${existingInvitations.length === 1 ? "existingInvitation" : "existingInvitations"}`,
                            {emails: splitListSemantically(existingInvitations, I18n.t("service.compliancySeparator"))})}/>}

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

                    <InputField value={message}
                                onChange={e => this.setState({message: e.target.value})}
                                placeholder={I18n.t("invitation.inviteesMessagePlaceholder")}
                                name={I18n.t("collaboration.message")}
                                large={true}
                                toolTip={I18n.t("invitation.inviteesTooltip")}
                                multiline={true}/>

                    <InputField value={invitation_sender_name}
                                onChange={e => this.setState({invitation_sender_name: e.target.value})}
                                placeholder={I18n.t("invitation.invitationSenderNamePlaceholder")}
                                name={I18n.t("collaboration.invitationSenderName")}
                                large={true}
                                toolTip={I18n.t("invitation.invitationSenderNameTooltip")}/>

                    <DateField value={expiry_date}
                               onChange={this.setInvitationExpiryDate}
                               allowNull={true}
                               pastDatesAllowed={this.props.config.past_dates_allowed}
                               maxDate={moment().add(31, "day").toDate()}
                               name={I18n.t("invitation.expiryDate")}
                               toolTip={I18n.t("invitation.expiryDateTooltip")}/>
                    {(!initial && isEmpty(expiry_date)) &&
                        <ErrorIndicator msg={I18n.t("invitation.requiredExpiryDate")}/>}
                </div>
            </div>
        )
    };

    renderActions = disabledSubmit => {
        return (
            <section className="actions">
                <Button cancelButton={true} txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                <Button disabled={disabledSubmit} txt={I18n.t("invitation.invite")}
                        onClick={this.submit}/>
            </section>
        )
    };

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
            invitation_sender_name,
            groups,
            selectedGroup,
            loading,
            existingInvitations
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const disabledSubmit = (!initial && !this.isValid());
        return (<>
            <UnitHeader obj={collaboration}
                        name={collaboration.name}/>
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelDialogAction}
                                confirm={confirmationDialogAction}
                                leavePage={leavePage}/>
            <div className="mod-new-collaboration-invitation">
                <h2>{I18n.t("collaborationInvitations.inviteWithLink")}</h2>
                {!collaboration.disable_join_requests &&
                    <div className="link-invitation-container">
                        <p>{I18n.t("collaborationInvitations.inviteWithLinkInfo")}</p>
                        <CopyToClipboard
                            text={`${this.props.config.base_url}/registration?collaboration=${collaboration.identifier}`}>
                            <Button txt={I18n.t("collaborationInvitations.inviteWithLinkCopy")}/>
                        </CopyToClipboard>
                    </div>}
                <h2>{I18n.t("collaborationInvitations.inviteWithEmail")}</h2>
                {this.invitationForm(initial, administrators, intended_role, message, invitation_sender_name,
                    expiry_date, disabledSubmit, groups, selectedGroup, membership_expiry_date, existingInvitations)}
                {this.renderActions(disabledSubmit)}
            </div>
        </>);
    }

}

export default NewInvitation;
