import React from "react";
import {
    organisationInvitationAccept,
    organisationInvitationByHash,
    organisationInvitationById,
    organisationInvitationDecline,
    organisationInvitationDelete,
    organisationInvitationResend
} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./OrganisationInvitation.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";
import {stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import moment from "moment";

class OrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationInvitation: {user: {}, organisation: {organisation_memberships: []},},
            acceptedTerms: false,
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            confirmationQuestion: "",
            leavePage: false,
            isAdminLink: false,
            isExpired: false,
            errorOccurred: false
        };
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        const today = moment();
        if (params.hash) {
            organisationInvitationByHash(params.hash)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    this.setState({organisationInvitation: json, isExpired});
                })
                .catch(() => setFlash(I18n.t("organisationInvitation.flash.notFound"), "error"));
        } else if (params.id) {
            organisationInvitationById(params.id)
                .then(json => {
                    const isExpired = today.isAfter(moment(json.expiry_date * 1000));
                    this.setState({organisationInvitation: json, isAdminLink: true, isExpired});
                })
                .catch(() => setFlash(I18n.t("organisationInvitation.flash.notFound"), "error"));
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoOrganisations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/organisations/${this.state.organisationInvitation.organisation.id}`));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.gotoOrganisations,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationQuestion: I18n.t("organisationInvitation.declineInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDecline
        });
    };

    doDecline = () => {
        const {organisationInvitation} = this.state;
        organisationInvitationDecline(organisationInvitation).then(res => {
            this.gotoOrganisations();
            setFlash(I18n.t("organisationInvitation.flash.inviteDeclined", {name: organisationInvitation.organisation.name}));
        });
    };

    delete = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationQuestion: I18n.t("organisationInvitation.deleteInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doDelete
        });
    };

    doDelete = () => {
        const {organisationInvitation} = this.state;
        organisationInvitationDelete(organisationInvitation.id).then(res => {
            this.gotoOrganisations();
            setFlash(I18n.t("organisationInvitation.flash.inviteDeleted", {name: organisationInvitation.organisation.name}));
        });
    };

    resend = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: false,
            confirmationQuestion: I18n.t("organisationInvitation.resendInvitation"),
            cancelDialogAction: this.closeConfirmationDialog,
            confirmationDialogAction: this.doResend
        });
    };

    doResend = () => {
        const {organisationInvitation} = this.state;
        organisationInvitationResend(organisationInvitation).then(res => {
            this.gotoOrganisations();
            setFlash(I18n.t("organisationInvitation.flash.inviteResend", {name: organisationInvitation.organisation.name}));
        });
    };

    isValid = () => {
        const {acceptedTerms, isAdminLink} = this.state;
        return acceptedTerms || isAdminLink;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {organisationInvitation} = this.state;
            organisationInvitationAccept(organisationInvitation)
                .then(res => {
                    this.props.history.push("/home");
                    setFlash(I18n.t("organisationInvitation.flash.inviteAccepted", {name: organisationInvitation.organisation.name}));
                    this.props.refreshUser();
                })
                .catch(e => {
                    if (e.response && e.response.json) {
                        e.response.json().then(res => {
                            if (res.message && res.message.indexOf("already a member") > -1) {
                                this.setState({errorOccurred: true}, () =>
                                    setFlash(I18n.t("organisationInvitation.flash.alreadyMember"), "error"));
                            }
                        });
                    } else {
                        throw e;
                    }
                });
        }
    };

    accept = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    requiredMarker = () => <sup className="required-marker">*</sup>;

    administrators = organisationInvitation => organisationInvitation.organisation.organisation_memberships
        .filter(m => m.role === "admin")
        .map(m => `${m.user.name} <${m.user.email}>`)
        .join(", ");

    render() {
        const {
            organisationInvitation, acceptedTerms, initial, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, confirmationQuestion, leavePage, isAdminLink, isExpired, errorOccurred
        } = this.state;
        const errorSituation = errorOccurred || !organisationInvitation.id;
        const disabledSubmit = !initial && !this.isValid();
        const expiredMessage = isAdminLink ? I18n.t("organisationInvitation.expiredAdmin", {expiry_date: moment(organisationInvitation.expiry_date * 1000).format("LL")}) :
            I18n.t("organisationInvitation.expired", {expiry_date: moment(organisationInvitation.expiry_date * 1000).format("LL")});

        return (
            <div className="mod-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={confirmationQuestion}/>
                <div className="title">
                    {isAdminLink && <a href="/organisations" onClick={e => {
                        stopEvent(e);
                        this.gotoOrganisations();
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("organisationInvitation.backToOrganisationDetail", {name: organisationInvitation.organisation.name})}
                    </a>}
                    {!errorSituation &&
                    <p className="title">{I18n.t("organisationInvitation.title", {organisation: organisationInvitation.organisation.name})}</p>}
                </div>

                <div className="organisation-invitation">
                    {isExpired &&
                    <p className="error">{expiredMessage}</p>}

                    <InputField value={organisationInvitation.organisation.name}
                                name={I18n.t("organisationInvitation.organisationName")}
                                disabled={true}/>

                    <InputField value={organisationInvitation.organisation.description}
                                name={I18n.t("organisationInvitation.organisationDescription")}
                                disabled={true}/>

                    <InputField value={this.administrators(organisationInvitation)}
                                name={I18n.t("organisationInvitation.organisationAdministrators")}
                                disabled={true}/>

                    <InputField value={organisationInvitation.user.name}
                                name={I18n.t("organisationInvitation.inviter")}
                                disabled={true}/>

                    <InputField value={organisationInvitation.message}
                                name={I18n.t("organisationInvitation.message")}
                                toolTip={I18n.t("organisationInvitation.messageTooltip", {name: organisationInvitation.user.name})}
                                disabled={true}
                                multiline={true}/>

                    {(!isAdminLink && !isExpired && !errorSituation) &&
                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: organisationInvitation.organisation.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  className={`checkbox ${!initial && !acceptedTerms ? "required" : ""}`}
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: organisationInvitation.organisation.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>}
                    {(!isAdminLink && !isExpired && !errorSituation) &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.accept")}
                                onClick={this.accept}/>
                        <Button cancelButton={true} txt={I18n.t("organisationInvitation.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}
                    {isAdminLink &&
                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.resend")}
                                onClick={this.resend}/>
                        <Button className="delete" txt={I18n.t("organisationInvitation.delete")}
                                onClick={this.delete}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}
                </div>
            </div>);
    };
}

export default OrganisationInvitation;