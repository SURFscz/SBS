import React from "react";
import {collaborationByIdentifier, joinRequestAlreadyMember, joinRequestForCollaboration} from "../api";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import "./Registration.scss";
import Button from "../components/Button";
import CheckBox from "../components/CheckBox";
import {isEmpty} from "../utils/Utils";
import {setFlash} from "../utils/Flash";
import {login} from "../utils/Login";

class Registration extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            step: "1",
            motivation: "",
            reference: "",
            acceptedTerms: false,
            personalDataConfirmation: false,
            collaborationName: null,
            collaborationAup: null,
            collaborationId: null,
            adminEmail: null,
            alreadyMember: false,
            noJoinRequestCollaboration: false
        }
    }

    componentDidMount = () => {
        const {collaboration} = this.props;
        if (!collaboration) {
            setFlash(I18n.t("registration.requiredCollaboration"), "error");
        } else {
            collaborationByIdentifier(collaboration)
                .then(res => {
                    if (res.disable_join_requests) {
                        setFlash(I18n.t("registration.noJoinRequestCollaboration", {name: collaboration}), "error");
                        this.setState({noJoinRequestCollaboration: true});
                        return;
                    }
                    const {user} = this.props;
                    const step = user.guest ? "1" : "2";
                    const promise = user.guest ? Promise.resolve(false) :
                        joinRequestAlreadyMember({"collaborationId": res.id});
                    promise.then(alreadyMember => {
                        if (alreadyMember) {
                            setFlash(I18n.t("registration.flash.alreadyMember", {name: res.name}), "error")
                        }
                        this.setState({
                            step: step,
                            collaborationName: res.name,
                            collaborationId: res.id,
                            collaborationAup: res.accepted_user_policy,
                            adminEmail: res.admin_email,
                            alreadyMember: alreadyMember
                        })
                    })
                })
                .catch(e => {
                    setFlash(I18n.t("registration.unknownCollaboration", {
                        collaboration: collaboration
                    }), "error")
                })
        }
    };


    doneClassName = (currentStep, step) => parseInt(step, 20) < parseInt(currentStep, 10) ? "done" : "";

    renderForm1 = () =>
        (<div className="step-form">
            <p className="form-title">{I18n.t("registration.formTitle", {collaboration: this.state.collaborationName || ""})}</p>
            {this.state.collaborationName &&
            <Button className="start" onClick={() => {
                const currentUrl = `${this.props.location.pathname}?collaboration=${this.props.collaboration}`;
                login(null, currentUrl);
            }} txt={I18n.t("registration.start")}/>
            }
        </div>);

    renderForm2 = () => {
        const {
            motivation, reference, acceptedTerms, personalDataConfirmation, collaborationName,
            collaborationAup, alreadyMember
        } = this.state;
        if (alreadyMember) {
            return null;
        }
        const {user} = this.props;
        return (<div className="step-form">
            <p className="form-title">{I18n.t("registration.formTitle", {collaboration: collaborationName || ""})}</p>
            <p>{I18n.t("registration.step2.registrationInfo")}</p>
            <section className={`form-element`}>
                {this.getUserTable(user)}
            </section>
            <section className={`form-element ${isEmpty(motivation) ? "invalid" : ""}`}>
                <label
                    className="form-label">{I18n.t("registration.step2.motivationInfo", {collaboration: collaborationName || ""})}</label>{this.requiredMarker()}
                <textarea rows="5"
                          value={motivation}
                          placeholder={I18n.t("registration.step2.motivationPlaceholder")}
                          onChange={e => this.setState({motivation: e.target.value})}/>
            </section>
            <section className={`form-element`}>
                <label
                    className="form-label">{I18n.t("registration.step2.reference", {collaboration: collaborationName})}</label>
                <input type="text"
                       value={reference}
                       placeholder={I18n.t("registration.step2.referencePlaceholder", {collaboration: collaborationName})}
                       onChange={e => this.setState({reference: e.target.value})}/>
            </section>
            <section
                className={`form-element ${((acceptedTerms || !collaborationAup) && personalDataConfirmation) ? "" : "invalid"}`}>
                <CheckBox name="personalDataConfirmation"
                          className={`checkbox ${!personalDataConfirmation ? "required" : ""}`}
                          value={personalDataConfirmation}
                          info={I18n.t("registration.step2.personalDataConfirmation", {name: collaborationName})}
                          onChange={e => this.setState({personalDataConfirmation: e.target.checked})}/>

                {!collaborationAup && <label className="policy form-label">
                    {I18n.t("registration.step2.noAup", {name: collaborationName})}</label>}

                {collaborationAup &&
                <CheckBox name="policy"
                          className={`checkbox policy ${!acceptedTerms ? "required" : ""}`}
                          value={acceptedTerms}
                          info={I18n.t("registration.step2.policyConfirmation",
                              {
                                  collaboration: collaborationName,
                                  aup: collaborationAup
                              })}
                          onChange={e => this.setState({acceptedTerms: e.target.checked})}/>}
            </section>
            <Button className="start"
                    disabled={!this.form2IsValid(motivation, acceptedTerms, personalDataConfirmation, collaborationAup)}
                    onClick={() => {
                        this.setState({step: "3"});
                        joinRequestForCollaboration(this.state)
                            .then(() => setFlash(I18n.t("registration.flash.success", {name: collaborationName})))
                            .catch(() => {
                                this.setState({alreadyMember: true});
                                setFlash(I18n.t("registration.flash.alreadyMember", {name: collaborationName}), "error");
                            });
                    }} txt={I18n.t("registration.request")}/>
        </div>);
    };

    renderForm3 = () => {
        const {collaborationName, adminEmail, alreadyMember} = this.state;
        if (alreadyMember) {
            return null;
        }
        return (
            <div className="step-form 3">
                <p className="form-title">{I18n.t("registration.formEndedTitle", {collaboration: collaborationName})}</p>
                <p className="info"
                   dangerouslySetInnerHTML={{
                       __html: I18n.t("registration.step3.info",
                           {collaboration: encodeURIComponent(collaborationName)})
                   }}/>
                {adminEmail && <p className="contact"
                                  dangerouslySetInnerHTML={{
                                      __html: I18n.t("registration.step3.contact",
                                          {mail: adminEmail})
                                  }}/>}
            </div>
        );
    };


    requiredMarker = () => <sup className="required-marker">*</sup>;

    form2IsValid = (motivation, acceptedTerms, personalDataConfirmation, collaborationAup) => {
        return !isEmpty(motivation) && (acceptedTerms || !collaborationAup) && personalDataConfirmation;
    };


    getUserTable = user => {
        return (
            <table>
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
                    <td className="attribute">{I18n.t("profile.organisations")}</td>
                    <td className="value">{(user.organisation_memberships || []).map(om => om.organisation.name)
                        .flat().join(", ")}</td>
                </tr>
                </tbody>
            </table>
        );
    };

    renderStepDivider = (currentStep, step) =>
        (<div key={step} className={`step-divider ${this.doneClassName(currentStep, step)}`}>
            {[1, 2, 3].map(i => <span key={i}><FontAwesomeIcon icon="circle"/></span>)}
        </div>);


    renderStep = (currentStep, step) => {
        const active = currentStep === step ? "active" : "";
        const done = this.doneClassName(currentStep, step);
        return (<div key={step} className={`step ${active} ${done}`}>
            <span className="step-info" data-for={step} data-tip>
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
        const {step, noJoinRequestCollaboration} = this.state;
        return <div className="mod-registration">
            <div className="step-container">
                {!noJoinRequestCollaboration && ["1", ".1.", "2", ".2.", "3"].map(i => this.renderStepPart(step, i))}
            </div>
            {!noJoinRequestCollaboration && this[`renderForm${step}`]()}
        </div>
    }

}

export default Registration;