import React from "react";

import I18n from "i18n-js";
import "./JoinRequestDialog.scss";
import Button from "./Button";
import InputField from "./InputField";
import {isEmpty} from "../utils/Utils";
import {joinRequestForCollaboration} from "../api";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import DOMPurify from "dompurify";
import {AlertType, Modal} from "@surfnet/sds";

export default class JoinRequestDialog extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            motivation: "",
            submitted: false,
        }
    }

    submit = () => {
        const {collaboration,} = this.props;
        joinRequestForCollaboration({...this.state, collaborationId: collaboration.id})
            .then(() => this.setState({submitted: true}));
    }

    gotoHome = () => {
        const {refresh} = this.props;
        refresh(() => setTimeout(() => this.props.history.push("/home/joinrequests"), 75));
    }

    renderForm = (collaboration, motivation) => {
        return (
            <div>
                <InputField name={I18n.t("registration.motivation", {name: collaboration.name})}
                            value={motivation}
                            multiline={true}
                            placeholder={I18n.t("registration.motivationPlaceholder")}
                            onChange={e => this.setState({motivation: e.target.value})}/>
            </div>
        );
    }

    renderFeedback = collaboration => {
        return (
            <div>
                <section className="explanation informational">
                    <InformationIcon/>
                    <span dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("registration.feedback.info", {
                            name: collaboration.name
                        }))
                    }}/>
                </section>
                <section className="actions">
                    <Button txt={I18n.t("confirmationDialog.ok")}
                            onClick={this.gotoHome}/>
                </section>
            </div>
        )
            ;
    }

    content = (submitted, collaboration, motivation) => {
        return (
            <div className="join-request-form">
                {!submitted &&
                this.renderForm(collaboration, motivation, close)}
            </div>
        );
    }

    render() {
        const {collaboration, isOpen = false, close} = this.props;
        const {motivation, submitted} = this.state;
        if (!isOpen) {
            return null;
        }
        const subTitle = submitted ? I18n.t("registration.feedback.info", {name: collaboration.name}) :
            I18n.t("registration.explanation", {name: collaboration.name});
        return (
            <Modal
                confirm={submitted ? this.gotoHome : this.submit}
                cancel={submitted ? null : close}
                alertType={AlertType.Info}
                subTitle={subTitle}
                children={this.content(submitted, collaboration, motivation)}
                title={I18n.t("registration.title", {name: collaboration.name})}
                cancelButtonLabel={submitted ? null : I18n.t("forms.cancel")}
                confirmationButtonLabel={submitted ? I18n.t("confirmationDialog.ok") : I18n.t("forms.request")}
                confirmDisabled={isEmpty(motivation)}
                question={null}/>
        );
    }

}

