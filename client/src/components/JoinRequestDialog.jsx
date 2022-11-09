import React from "react";
import Modal from "react-modal";
import I18n from "i18n-js";
import "./JoinRequestDialog.scss";
import Button from "./Button";
import InputField from "./InputField";
import {isEmpty} from "../utils/Utils";
import {joinRequestForCollaboration} from "../api";
import {ReactComponent as InformationIcon} from "../icons/informational.svg";
import DOMPurify from "dompurify";

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

    joinRequestDisclaimer = () => {
        return (<div className="join-request-disclaimer">
            <p>{I18n.t("welcomeDialog.infoJoinRequest")}</p>
        </div>);
    }

    renderForm = (collaboration, motivation, close) => {
        return (
            <div>
                <section className="explanation">
                    <span
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("registration.explanation", {name: collaboration.name}))}}/>
                </section>
                <InputField name={I18n.t("registration.motivation", {name: collaboration.name})}
                            value={motivation}
                            multiline={true}
                            placeholder={I18n.t("registration.motivationPlaceholder")}
                            onChange={e => this.setState({motivation: e.target.value})}/>
                <section className="actions">
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                            onClick={close}/>
                    <Button txt={I18n.t("forms.request")}
                            disabled={isEmpty(motivation)}
                            onClick={this.submit}/>
                </section>
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

    render() {
        const {collaboration, isOpen = false, close} = this.props;
        const {motivation, submitted} = this.state;
        return (
            <Modal
                isOpen={isOpen}
                onRequestClose={close}
                contentLabel={I18n.t("registration.title", {name: collaboration.name})}
                className="join-request-dialog-content"
                overlayClassName="join-request-dialog-overlay"
                closeTimeoutMS={250}
                ariaHideApp={false}>
                <h1>{I18n.t("registration.title", {name: collaboration.name})}</h1>
                <div className="join-request-form">
                    {!submitted &&
                    this.renderForm(collaboration, motivation, close)}
                    {submitted && this.renderFeedback(collaboration)}
                </div>


            </Modal>
        );
    }

}

