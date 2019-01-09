import React from "react";
import {inviteForCollaboration, serviceByEntityId} from "../api";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import "./Registration.scss";
import Button from "../components/Button";
import CheckBox from "../components/CheckBox";
import {isEmpty} from "../utils/Utils";
import {setFlash} from "../utils/Flash";

class Registration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            step: "1",
            motivation: "",
            reference: "",
            agreedWithPolicy: false,
            serviceName: null,
            serviceId: null
        }
    }

    componentDidMount = () => {
        serviceByEntityId(this.props.service)
            .then(json => {
                const {user} = this.props;
                const step = user.guest ? "1" : "2";
                this.setState({step: step, serviceName: json.name, serviceId: json.id});
            })
            .catch(e => {
                setFlash(I18n.t("registration.unknownService", {service: this.props.service}), "error")
            })
    };


    doneClassName = (currentStep, step) => parseInt(step, 20) < parseInt(currentStep, 10) ? "done" : "";

    renderForm1 = () =>
        (<div className="step-form">
            <p className="form-title">{I18n.t("registration.formTitle", {service: this.state.serviceName || ""})}</p>
            {this.state.serviceName && <Button className="start" onClick={() => {
                window.location.href = `/login?state=${this.props.service}`;
            }} txt={I18n.t("registration.start")}/>}
        </div>);

    renderForm2 = () => {
        const {motivation, reference, agreedWithPolicy, serviceName} = this.state;
        const {user} = this.props;
        return (<div className="step-form">
            <p className="form-title">{I18n.t("registration.formTitle", {service: serviceName || ""})}</p>
            <p>{I18n.t("registration.step2.registrationInfo")}</p>
            <section className={`form-element`}>
                {this.getUserTable(user)}
            </section>
            <section className={`form-element ${isEmpty(motivation) ? "invalid" : ""}`}>
                <label
                    className="form-label">{I18n.t("registration.step2.motivationInfo", {service: serviceName || ""})}</label>{this.requiredMarker()}
                <textarea rows="5"
                          value={motivation}
                          placeholder={I18n.t("registration.step2.motivationPlaceholder")}
                          onChange={e => this.setState({motivation: e.target.value})}/>
            </section>
            <section className={`form-element`}>
                <label
                    className="form-label">{I18n.t("registration.step2.reference", {service: serviceName})}</label>
                <input type="text"
                       value={reference}
                       placeholder={I18n.t("registration.step2.referencePlaceholder", {service: serviceName})}
                       onChange={e => this.setState({reference: e.target.value})}/>
            </section>
            <section className={`form-element ${agreedWithPolicy ? "" : "invalid"}`}>
                <label className="form-label"
                       dangerouslySetInnerHTML={{__html: I18n.t("registration.step2.policyInfo", {service: serviceName})}}/>{this.requiredMarker()}
                <CheckBox name="policy"
                          value={agreedWithPolicy}
                          info={I18n.t("registration.step2.policyConfirmation", {service: serviceName})}
                          onChange={e => this.setState({agreedWithPolicy: e.target.checked})}/>
            </section>
            <Button className="start" disabled={!this.form2Invariant(motivation, agreedWithPolicy)}
                    onClick={() => {
                        this.setState({step: "3"});
                        inviteForCollaboration(this.state);
                    }} txt={I18n.t("registration.request")}/>
        </div>);
    };

    renderForm3 = () => {
        const {serviceName} = this.state;
        return (
            <div className="step-form 3">
                <p className="form-title">{I18n.t("registration.formEndedTitle", {service: serviceName})}</p>
                <p className="info"
                   dangerouslySetInnerHTML={{__html: I18n.t("registration.step3.info", {service: serviceName})}}/>
                <p className="contact"
                   dangerouslySetInnerHTML={{__html: I18n.t("registration.step3.contact", {service: serviceName})}}/>
            </div>
        );
    };


    requiredMarker = () => <sup className="required-marker">*</sup>;

    form2Invariant = (motivation, agreedWithPolicy) => !isEmpty(motivation) && agreedWithPolicy;

    getUserTable = user =>
        (<table>
            <thead/>
            <tbody>
            <tr>
                <td className="attribute">{I18n.t("profile.name")}</td>
                <td className="value">{user.name}</td>
            </tr>
            <tr>
                <td className="attribute">{I18n.t("profile.email")}</td>
                <td className="value">{user.email}</td>
            </tr>
            <tr>
                <td className="attribute">{I18n.t("profile.organization")}</td>
                <td className="value">{user.organization}</td>
            </tr>
            </tbody>
        </table>);

    renderStepDivider = (currentStep, step) =>
        (<div key={step} className={`step-divider ${this.doneClassName(currentStep, step)}`}>
            {[1, 2, 3].map(i => <span key={i}><FontAwesomeIcon icon="circle"/></span>)}
        </div>);


    renderStep = (currentStep, step) => {
        const active = currentStep === step ? "active" : "";
        const done = this.doneClassName(currentStep, step);
        return (<div key={step} className={`step ${active} ${done}`}>
            <span className="step-info" data-for={step} data-tip>
                {/*<FontAwesomeIcon icon="info-circle"/>*/}
                {/*<ReactTooltip id={step} type="info" class="tool-tip" effect="solid" dataBorder={true}>*/}
                {/*<span dangerouslySetInnerHTML={{__html: I18n.t(`registration.step${step}.tooltip`)}}/>*/}
                {/*</ReactTooltip>*/}
                {done && <FontAwesomeIcon className="check" icon="check"/>}
            </span>
            <div>
                <span className="step-number">{step}</span>
                <span className="step-title">{I18n.t(`registration.step${step}.title`)}</span>
            </div>
            <span className="step-sub">{I18n.t(`registration.step${step}.sub`)}</span>
            <FontAwesomeIcon icon={I18n.t(`registration.step${step}.icon`)}
                             className={`step-icon ${active} ${done}`}/>
        </div>);
    };


    renderStepPart = (currentStep, step) =>
        step.startsWith(".") ? this.renderStepDivider(currentStep, step.substring(1, 3)) : this.renderStep(currentStep, step);

    render() {
        const {step} = this.state;
        return <div className="registration">
            <div className="step-container">
                {["1", ".1.", "2", ".2.", "3"].map(i => this.renderStepPart(step, i))}
            </div>
            {this[`renderForm${step}`]()}
        </div>
    }

}

export default Registration;