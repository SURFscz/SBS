import React from "react";
import "./Home.scss";
import {
    organisationInvitationAccept,
    organisationInvitationByHash,
    organisationInvitationById,
    organisationInvitationDecline
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

class OrganisationInvitation extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationInvitation: {user: {}, organisation: {organisation_memberships: []},},
            acceptedTerms: false,
            initial: true,
            readOnly: true,
            confirmationDialogOpen: false,
            leavePage: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true,
            isAdminLink : false
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            organisationInvitationByHash(params.hash)
                .then(json => {
                    this.setState({organisationInvitation: json, readOnly: false});
                });
        } else if (params.id) {
            organisationInvitationById(params.id)
                .then(json => {
                    this.setState({organisationInvitation: json, isAdminLink: true});
                });
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoOrganisations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/organisations/${this.state.organisationInvitation.organisation.id}`));

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: true,
            cancelDialogAction: this.gotoOrganisations, confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    decline = () => {
        this.setState({
            confirmationDialogOpen: true, leavePage: false,
            cancelDialogAction: this.closeConfirmationDialog, confirmationDialogAction: this.doDecline
        });
    };

    doDecline = () => {
        const {organisationInvitation} = this.state;
        organisationInvitationDecline(organisationInvitation).then(res => {
            this.props.history.push("/organisations");
            setFlash(I18n.t("organisationInvitation.flash.inviteDeclined", {name: organisationInvitation.organisation.name}));
        });
    };

    isValid = () => {
        const {acceptedTerms, readOnly} = this.state;
        return acceptedTerms || readOnly;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {organisationInvitation} = this.state;
            organisationInvitationAccept(organisationInvitation).then(res => {
                this.gotoOrganisations();
                setFlash(I18n.t("organisationInvitation.flash.inviteAccepted", {name: organisationInvitation.organisation.name}));
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
            confirmationDialogAction, readOnly, leavePage, isAdminLink
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("organisationInvitation.declineInvitation")}/>
                <div className="title">
                    {isAdminLink && <a href="/organisations" onClick={e => {
                        stopEvent(e);
                        this.props.history.push(`/organisations`)
                    }}><FontAwesomeIcon icon="arrow-left"/>
                        {I18n.t("organisationDetail.backToOrganisations")}
                    </a>}
                    <p className="title">{I18n.t("organisationInvitation.title", {organisation: organisationInvitation.organisation.name})}</p>
                </div>

                <div className="organisation-invitation">
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

                    {!readOnly &&
                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: organisationInvitation.organisation.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: organisationInvitation.organisation.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>}
                    {!isAdminLink && <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.accept")}
                                onClick={this.accept}/>
                        <Button cancelButton={true} txt={I18n.t("organisationInvitation.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>}
                    {/*TODO: if adminLink then show resend / delete    */}
                </div>
            </div>);
    };
}

export default OrganisationInvitation;