import React from "react";
import {health} from "../api";
import ReactTooltip from "react-tooltip";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import "./Registration.scss";

class Registration extends React.Component {


    constructor(props, context) {
        super(props, context);
        this.state = {
            step: "1",
        }
    }

    componentDidMount = () => {
        health();
    };

    renderStepDivider = () => <div className="step-divider">
        {[1, 2, 3].map(i => <span><FontAwesomeIcon icon="circle"/></span>)}
    </div>;


    renderStep = (step, active) =>
        <div className={`step ${active ? "active" : ""}`}>
            <span className="step-info" data-for={step} data-tip>
                <FontAwesomeIcon icon="info-circle"/>
                    <ReactTooltip id={step} type="info" class="tool-tip" effect="solid" dataBorder={true}>
                        <span dangerouslySetInnerHTML={{__html: I18n.t(`registration.step${step}.tooltip`)}}/>
                    </ReactTooltip>
            </span>
            <div>
                <span className="step-number">{step}</span>
                <span className="step-title">{I18n.t(`registration.step${step}.title`)}</span>
            </div>
            <span className="step-sub">{I18n.t(`registration.step${step}.sub`)}</span>
            <FontAwesomeIcon icon={I18n.t(`registration.step${step}.icon`)}
                             className={`step-icon ${active ? "active" : ""}`}/>
        </div>;

    renderStepPart = (step, active) =>
        step === "." ? this.renderStepDivider() : this.renderStep(step, active);

    render() {
        return <div className="registration">
            <div className="step-container">
                {["1", ".", "2", ".", "3"].map(step => this.renderStepPart(step, this.state.step === step))}
            </div>
        </div>
    }
}

export default Registration;