import React from "react";
import I18n from "../../locale/I18n";
import Entities from "./Entities";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import "./OrganisationInvitations.scss";
import {isInvitationExpired, shortDateFromEpoch} from "../../utils/Date";
import {stopEvent} from "../../utils/Utils";
import Button from "../button/Button";
import ConfirmationDialog from "../confirmation-dialog/ConfirmationDialog";
import UserColumn from "./UserColumn";
import InputField from "../InputField";
import moment from "moment";
import ErrorIndicator from "./ErrorIndicator";
import Logo from "./Logo";
import {organisationInvitationDelete, organisationInvitationResend} from "../../api";
import SpinnerField from "./SpinnerField";
import {setFlash} from "../../utils/Flash";
import {Chip, ChipType} from "@surfnet/sds";

class OrganisationInvitations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedInvitationId: null,
            message: "",
            confirmationDialogOpen: false,
            confirmationTxt: I18n.t("confirmationDialog.confirm"),
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: "",
            loading: false
        }
    }

    gotoInvitation = invitation => e => {
        stopEvent(e);
        const {organisation_invitations, toggleShowOrganisationsWithoutAdmin, toggleShowServicesWithoutAdmin} = this.props;
        const selectedInvitation = organisation_invitations.find(i => i.id === invitation.id);
        this.setState({selectedInvitationId: selectedInvitation.id, message: selectedInvitation.message});
        toggleShowOrganisationsWithoutAdmin(false);
        toggleShowServicesWithoutAdmin(false);
    };

    getSelectedInvitation = () => {
        const {selectedInvitationId} = this.state;
        const {organisation_invitations} = this.props;
        return organisation_invitations.find(i => i.id === selectedInvitationId);
    }

    cancelSideScreen = e => {
        stopEvent(e);
        const {toggleShowOrganisationsWithoutAdmin, toggleShowServicesWithoutAdmin} = this.props;
        this.setState({selectedInvitationId: null, message: "", confirmationDialogOpen: false, loading: false});
        toggleShowOrganisationsWithoutAdmin(true);
        toggleShowServicesWithoutAdmin(true);
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            isWarning: true,
            confirmationQuestion: I18n.t("organisationInvitation.deleteInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const invitation = this.getSelectedInvitation();
        const {refresh} = this.props;
        this.setState({loading: true});
        organisationInvitationDelete(invitation.id, false).then(() => {
            refresh(() => {
                this.cancelSideScreen();
                setFlash(I18n.t("organisationInvitation.flash.inviteDeleted", {name: invitation.organisation.name}));
            });

        })
    };

    resend = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            isWarning: false,
            confirmationQuestion: I18n.t("organisationInvitation.resendInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doResend
        });
    };

    doResend = () => {
        const {message} = this.state;
        const {refresh} = this.props;
        const invitation = this.getSelectedInvitation();
        this.setState({loading: true});
        organisationInvitationResend({...invitation, message}, false)
            .then(() => {
                refresh(() => {
                    this.cancelSideScreen();
                    setFlash(I18n.t("organisationInvitation.flash.inviteResend", {name: invitation.organisation.name}));
                })
            })
    };

    renderSelectedInvitation = invitation => {
        const {
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion,
            isWarning, message, confirmationTxt
        } = this.state;
        const today = moment();
        const inp = moment(invitation.expiry_date * 1000);
        const isExpired = today.isAfter(inp);
        const expiredMessage = isExpired ? I18n.t("organisationInvitation.expiredAdmin", {expiry_date: inp.format("LL")}) : null;
        return (
            <div className="organisation-invitation-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    isWarning={isWarning}
                                    confirmationTxt={confirmationTxt}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>
                <div>
                    <a className="back-to-org-members" onClick={this.cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.orgInvitations.backToMembers")}
                    </a>
                </div>
                <div className="organisation-invitation-form">
                    {isExpired && <ErrorIndicator msg={expiredMessage} standalone={true}/>}
                    <h2>{I18n.t("models.orgMembers.invitation",
                        {
                            date: moment(invitation.created_at * 1000).format("LL"),
                            inviter: invitation.user.name,
                            email: invitation.invitee_email
                        })}</h2>
                    <div className={"organisation-meta"}>
                        <InputField value={I18n.t(`organisation.organisationRoles.${invitation.intended_role}`)}
                                    noInput={true}
                                    name={I18n.t("organisationInvitation.role")}
                                    disabled={true}/>

                        <InputField value={moment(invitation.expiry_date * 1000).format("LL")}
                                    noInput={true}
                                    name={I18n.t("organisationInvitation.expiryDate")}
                                    disabled={true}/>
                    </div>
                    <InputField value={message}
                                name={I18n.t("organisationInvitation.message")}
                                toolTip={I18n.t("organisationInvitation.messageTooltip", {name: invitation.user.name})}
                                onChange={e => this.setState({message: e.target.value})}
                                large={true}
                                multiline={true}/>

                    <section className="actions">
                        <Button warningButton={true}
                                onClick={this.delete}/>
                        <Button cancelButton={true} txt={I18n.t("forms.close")} onClick={this.cancelSideScreen}/>
                        <Button txt={I18n.t("organisationInvitation.resend")}
                                onClick={this.resend}/>
                    </section>
                </div>
            </div>)

    }


    render() {
        const {organisation_invitations} = this.props;
        const {
            confirmationDialogOpen, cancelDialogAction, loading,
            confirmationDialogAction, confirmationQuestion, confirmationTxt
        } = this.state;
        if (loading) {
            return <SpinnerField/>
        }
        const selectedInvitation = this.getSelectedInvitation();
        if (selectedInvitation) {
            return this.renderSelectedInvitation(selectedInvitation);
        }

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: invitation => <Logo src={invitation.organisation.logo}/>
            },
            {
                nonSortable: false,
                key: "organisation_name",
                header: I18n.t("models.orgInvitations.orgName"),
                mapper: entity => <span>{entity.organisation.name}</span>
            },
            {
                nonSortable: true,
                key: "name",
                header: I18n.t("models.users.name_email"),
                mapper: entity => <UserColumn entity={entity} showMe={false}
                                              gotoInvitation={this.gotoInvitation}/>
            },
            {
                key: "intended_role",
                header: I18n.t("models.users.role"),
                mapper: entity => <span>{I18n.t(`organisation.${entity.intended_role}`)}</span>
            },
            {
                nonSortable: true,
                key: "status",
                header: I18n.t("models.orgMembers.status"),
                mapper: entity => {
                    const isExpired = entity.invite && isInvitationExpired(entity);
                    return <Chip
                            label={isExpired ? I18n.t("models.orgMembers.expiredAt", {date: shortDateFromEpoch(entity.expiry_date)}) :
                                I18n.t("models.orgMembers.inviteSend", {date: shortDateFromEpoch(entity.created_at)})}
                            type={isExpired ? ChipType.Status_error : ChipType.Status_info}/>
                }
            },
        ]
        return (<>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    confirmationTxt={confirmationTxt}
                                    question={confirmationQuestion}/>

                <Entities entities={organisation_invitations}
                          modelName="orgInvitations"
                          searchAttributes={["user__name", "user__email", "invitee_email"]}
                          defaultSort="name"
                          columns={columns}
                          rowLinkMapper={() => this.gotoInvitation}
                          loading={loading}
                          {...this.props}/>
            </>
        )
    }
}

export default OrganisationInvitations;
