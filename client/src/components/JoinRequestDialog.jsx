import React from "react";

import I18n from "../locale/I18n";
import "./JoinRequestDialog.scss";
import InputField from "./InputField";
import {isEmpty} from "../utils/Utils";
import {joinRequestForCollaboration} from "../api";
import {Modal} from "@surfnet/sds";
import RadioButtonGroup from "./redesign/RadioButtonGroup";
import DOMPurify from "dompurify";

export default class JoinRequestDialog extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            motivation: "",
            reason: "invited",
            submitted: false,
        }
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

    content = (submitted, collaboration, motivation, reason) => {
        return (
            <div className="join-request-form">
                {!submitted &&
                    <div>
                        <RadioButtonGroup name={"reason"}
                                          label={I18n.t("joinRequest.why")}
                                          value={reason}
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
                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("registration.feedback.info", {name: collaboration.name}))}}/>
                </div>}
            </div>
        );
    }

    render() {
        const {collaboration, isOpen = false, close} = this.props;
        const {motivation, submitted, reason} = this.state;
        if (!isOpen) {
            return null;
        }
        return (
            <Modal
                confirm={submitted ? this.gotoHome : this.submit}
                cancel={submitted ? null : close}
                children={this.content(submitted, collaboration, motivation, reason)}
                title={I18n.t("registration.title", {name: collaboration.name})}
                cancelButtonLabel={submitted ? null : I18n.t("forms.cancel")}
                confirmationButtonLabel={submitted ? I18n.t("confirmationDialog.ok") : I18n.t("forms.request")}
                confirmDisabled={isEmpty(motivation) && reason === "other"}
                question={null}/>
        );
    }

}

