import React from "react";
import "./Home.scss";
import {organisationInvitationAccept, organisationInvitationByHash} from "../api";
import I18n from "i18n-js";
import InputField from "../components/InputField";
import "./Organisationinvite.scss";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {setFlash} from "../utils/Flash";
import CheckBox from "../components/CheckBox";

class OrganisationInvite extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationInvite: {organisation: {organisation_memberships: []},},
            acceptedTerms: false,
            initial: true,
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false},
                () => this.props.history.push("/organisations"))
        };
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.hash) {
            organisationInvitationByHash(params.hash)
                .then(json => this.setState({organisationInvite: json}))
                .catch(e => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    cancel = () => {
        this.setState({confirmationDialogOpen: true});
    };

    decline = () => {
        this.setState({confirmationDialogOpen: true});
    };

    isValid = () => {
        const {acceptedTerms} = this.state;
        return acceptedTerms;
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {organisationInvite} = this.state;
            organisationInvitationAccept(organisationInvite).then(res => {
                this.props.history.push(`/organisations/${organisationInvite.organisation.id}`);
                setFlash(I18n.t("organisationInvitation.flash.inviteAccepted", {name: res.organisationInvite.organisation.name}));
            });
        }
    };

    accept = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        }
    };

    requiredMarker = () => <sup className="required-marker">*</sup>;

    render() {
        const {
            organisationInvite, acceptedTerms, initial, confirmationDialogOpen, cancelDialogAction, confirmationDialogAction,
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const disabled = false;
        return (
            <div className="mod-organisation-invitation">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={I18n.t("organisationInvitation.declineInvitation")}/>

                <div className="organisation-invitation">
                    <p className="title">{I18n.t("organisationInvitation.title", {organisation: organisationInvite.organisation.name})}</p>
                    <InputField value={organisationInvite.organisation.name}
                                name={I18n.t("organisationInvitation.organisationName")}
                                disabled={disabled}/>

                    <InputField value={organisationInvite.organisation.description}
                                name={I18n.t("organisationInvitation.organisationDescription")}
                                disabled={disabled}/>

                    <InputField value={organisationInvite.organisation.administrators}
                                name={I18n.t("organisationInvitation.organisationAdministrators")}
                                disabled={disabled}/>

                    <InputField value={organisationInvite.message}
                                name={I18n.t("organisationInvitation.message")}
                                toolTip={I18n.t("organisationInvitation.messageTooltip")}
                                multiline={true}/>

                    <section className={`form-element ${acceptedTerms ? "" : "invalid"}`}>
                        <label className="form-label"
                               dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {collaboration: organisationInvite.organisation.name})}}/>{this.requiredMarker()}
                        <CheckBox name="policy"
                                  value={acceptedTerms}
                                  info={I18n.t("registration.step2.policyConfirmation", {collaboration: organisationInvite.organisation.name})}
                                  onChange={e => this.setState({acceptedTerms: e.target.checked})}/>
                    </section>

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