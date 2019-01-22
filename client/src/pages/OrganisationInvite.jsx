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
import "./OrganisationInvite.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";

class OrganisationInvite extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationInvite: {user: {}, organisation: {organisation_memberships: []},},
            acceptedTerms: false,
            initial: true,
            readOnly: true,
            confirmationDialogOpen: false,
            leavePage: false,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => true
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            organisationInvitationByHash(params.hash)
                .then(json => {
                    this.setState({organisationInvite: json, readOnly: false});
                })
                .catch(e => this.props.history.push("/404"));
        } else if (params.id) {
            organisationInvitationById(params.id)
                .then(json => {
                    this.setState({organisationInvite: json});
                })
                .catch(e => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    gotoOrganisations = () => this.setState({confirmationDialogOpen: false},
        () => this.props.history.push(`/organisations/${this.state.organisationInvite.organisation.id}`));

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
        const {organisationInvite} = this.state;
        organisationInvitationDecline(organisationInvite).then(res => {
            this.props.history.push("/organisations");
            setFlash(I18n.t("organisationInvitation.flash.inviteDeclined", {name: organisationInvite.organisation.name}));
        });
    };

    isValid = () => {
        const {acceptedTerms, readOnly} = this.state;
        return acceptedTerms || readOnly;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {organisationInvite} = this.state;
            organisationInvitationAccept(organisationInvite).then(res => {
                this.gotoOrganisations();
                setFlash(I18n.t("organisationInvitation.flash.inviteAccepted", {name: organisationInvite.organisation.name}));
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

    administrators = organisationInvite => organisationInvite.organisation.organisation_memberships
        .filter(m => m.role === "admin")
        .map(m => `${m.user.name} <${m.user.email}>`)
        .join(", ");

    render() {
        const {
            organisationInvite, acceptedTerms, initial, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction, readOnly, leavePage
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        return (
            <div className="mod-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    leavePage={leavePage}
                                    question={I18n.t("organisationInvitation.declineInvitation")}/>

                <div className="organisation-invitation">
                    <p className="title">{I18n.t("organisationInvitation.title", {organisation: organisationInvite.organisation.name})}</p>
                    <InputField value={organisationInvite.organisation.name}
                                name={I18n.t("organisationInvitation.organisationName")}
                                disabled={true}/>

                    <InputField value={organisationInvite.organisation.description}
                                name={I18n.t("organisationInvitation.organisationDescription")}
                                disabled={true}/>

                    <InputField value={this.administrators(organisationInvite)}
                                name={I18n.t("organisationInvitation.organisationAdministrators")}
                                disabled={true}/>

                    <InputField value={organisationInvite.user.name}
                                name={I18n.t("organisationInvitation.inviter")}
                                disabled={true}/>

                    <InputField value={organisationInvite.message}
                                name={I18n.t("organisationInvitation.message")}
                                toolTip={I18n.t("organisationInvitation.messageTooltip", {name: organisationInvite.user.name})}
                                disabled={true}
                                multiline={true}/>

                    {!readOnly &&
                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: organisationInvite.organisation.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: organisationInvite.organisation.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>}

                    <section className="actions">
                        <Button disabled={disabledSubmit} txt={I18n.t("organisationInvitation.accept")}
                                onClick={this.accept}/>
                        <Button cancelButton={true} txt={I18n.t("organisationInvitation.decline")}
                                onClick={this.decline}/>
                        <Button className="white" txt={I18n.t("forms.cancel")} onClick={this.cancel}/>
                    </section>
                </div>
            </div>);
    };
}

export default OrganisationInvite;