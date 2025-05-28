import React from "react";

import I18n from "../../locale/I18n";
import "./JoinRequestDialog.scss";
import InputField from "../input-field/InputField";
import {isEmpty} from "../../utils/Utils";
import {joinRequestForCollaboration} from "../../api";
import {Modal} from "@surfnet/sds";
import RadioButtonGroup from "../_redesign/RadioButtonGroup";
import DOMPurify from "dompurify";
import CollaborationAupAcceptance from "../collaboration-aup-acceptance/CollaborationAupAcceptance";
import OrganisationAupAcceptance from "../OrganisationAupAcceptance";
import {aupData} from "../../utils/Aups";

export default class JoinRequestDialog extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            motivation: "",
            reason: "invited",
            submitted: false,
            organisationDisabled: false,
            disabled: false,
            services: []
        }
    }

    componentDidMount = () => {
        const {collaboration, user} = this.props;
        const {
            services,
            hasServices,
            requiresOrganisationAup,
            allServiceAupsAgreedOn
        } = aupData(user, collaboration);

        this.setState({
            disabled: hasServices && !allServiceAupsAgreedOn,
            organisationDisabled: requiresOrganisationAup,
            requiresOrganisationAup: requiresOrganisationAup,
            services: services,
            allServiceAupsAgreedOn: allServiceAupsAgreedOn,

        });
    }

    submit = () => {
        const {collaboration} = this.props;
        const {reason, motivation} = this.state;
        const motivationValue = reason === "other" ? motivation : I18n.t(`joinRequest.${reason}`);
        joinRequestForCollaboration({motivation: motivationValue, collaborationId: collaboration.id})
            .then(() => this.setState({submitted: true}));
    }

    gotoHome = () => {
        const {refresh} = this.props;
        refresh(() => setTimeout(() => this.props.history.push("/home/joinrequests"), 75));
    }

    aupAcceptance = () => {
        const {adminEmails, serviceEmails, collaboration} = this.props;
        const {requiresOrganisationAup, disabled, organisationDisabled, services, allServiceAupsAgreedOn} = this.state;
        return (
            <>
                <CollaborationAupAcceptance services={services}
                                            disabled={disabled}
                                            serviceEmails={serviceEmails}
                                            setDisabled={() => this.setState({disabled: !this.state.disabled})}
                                            allServiceAupsAgreedOn={allServiceAupsAgreedOn}
                                            children={services.length > 0 ?
                                                <h4 className="aup-services">{I18n.t("models.collaboration.joinRequestServices", {
                                                    nbr: services.length,
                                                    name: collaboration.name
                                                })}</h4> :
                                                <h4 className="aup-services">{I18n.t("models.collaboration.noServicesYet")}</h4>}
                />
                {requiresOrganisationAup &&
                    <OrganisationAupAcceptance adminEmails={adminEmails}
                                               disabled={organisationDisabled}
                                               setDisabled={() => this.setState({organisationDisabled: !this.state.organisationDisabled})}
                                               organisation={collaboration.organisation}/>
                }
            </>
        );
    }

    content = (submitted, collaboration, motivation, reason) => {
        return (
            <>
                <div className="join-request-form">
                    {!submitted &&
                        <div>
                            <RadioButtonGroup name={"reason"}
                                              label={I18n.t("joinRequest.why")}
                                              value={reason}
                                              horizontal={false}
                                              values={["invited", "projectMember", "other"]}
                                              onChange={value => this.setState({reason: value})}
                                              labelResolver={label => I18n.t(`joinRequest.${label}`)}/>
                            {reason === "other" &&
                                <InputField name={I18n.t("registration.motivation", {name: collaboration.name})}
                                            value={motivation}
                                            multiline={true}
                                            placeholder={I18n.t("registration.motivationPlaceholder")}
                                            onChange={e => this.setState({motivation: e.target.value})}/>}
                        </div>}
                    {submitted && <div>
                    <span
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("registration.feedback.info", {name: collaboration.name}))}}/>
                    </div>}

                </div>
                {!submitted && this.aupAcceptance()}
            </>
        );
    }

    render() {
        const {collaboration, isOpen = false, close} = this.props;
        const {motivation, submitted, reason, disabled, organisationDisabled} = this.state;
        if (!isOpen) {
            return null;
        }

        return (
            <Modal
                confirm={submitted ? this.gotoHome : this.submit}
                cancel={submitted ? null : close}
                className="join-request-dialog"
                children={this.content(submitted, collaboration, motivation, reason)}
                title={I18n.t("registration.title", {name: collaboration.name})}
                cancelButtonLabel={submitted ? null : I18n.t("forms.cancel")}
                confirmationButtonLabel={submitted ? I18n.t("confirmationDialog.ok") : I18n.t("forms.request")}
                confirmDisabled={disabled || organisationDisabled || (isEmpty(motivation) && reason === "other")}
                question={null}/>
        );
    }

}
