import React from "react";
import "./Welcome.scss";
import I18n from "i18n-js";
import {identityProviderDisplayName, organisationByUserSchacHomeOrganisation} from "../../api";
import {isEmpty} from "../../utils/Utils";
import {ReactComponent as InformationIcon} from "../../icons/informational.svg";
import {ReactComponent as CriticalIcon} from "../../icons/critical.svg";
import SpinnerField from "./SpinnerField";
import "react-mde/lib/styles/css/react-mde-all.css";
import * as Showdown from "showdown";
import Button from "../Button";
import {AppStore} from "../../stores/AppStore";
import {sanitizeHtml} from "../../utils/Markdown";

const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true
});

class Welcome extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: {},
            idpDisplayName: I18n.t("welcome.unknown"),
            loading: true
        };
    }

    componentDidMount() {
        Promise.all([organisationByUserSchacHomeOrganisation(), identityProviderDisplayName()])
            .then(res => {
                this.setState({
                    organisation: res[0],
                    idpDisplayName: res[1] ? res[1].display_name : this.state.idpDisplayName,
                    loading: false
                });
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")}
                    ];
                });
            });
    }

    knownOrganisation = organisation => {
        const hasOnBoardingMsg = !isEmpty(organisation.on_boarding_msg);
        const stepTwo = hasOnBoardingMsg ? 2 : 1;
        const canCreate = organisation.collaboration_creation_allowed_entitlement || organisation.collaboration_creation_allowed;
        const hasOrgMembers = organisation.has_members;
        return (
            <div>
                {hasOnBoardingMsg && <div>
                    <h1>{I18n.t("welcome.whatYouCanDo")}</h1>
                    <h3 className="step">
                        <span>1.</span>
                        <span dangerouslySetInnerHTML={{
                            __html: I18n.t("welcome.instructions", {name: organisation.name})
                        }}/>
                    </h3>
                    <div className="instructions mde-preview">
                        <div className="mde-preview-content">
                            <p dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(converter.makeHtml(organisation.on_boarding_msg))
                            }}/>
                        </div>
                    </div>
                </div>}
                {hasOrgMembers && <div>
                    <h3 className={`step ${hasOnBoardingMsg ? "" : "orphan"}`}><span>{stepTwo}.</span>
                        {I18n.t(`welcome.${canCreate ? "createColl" : "createCollRequest"}`)}
                    </h3>
                    <p>
                        {I18n.t(`welcome.${canCreate ? "startCreateColl" : "startCreateCollRequest"}`)}
                    </p>
                    <Button onClick={() => this.props.history.push("/new-collaboration")}
                            txt={I18n.t(`welcome.${canCreate ? "createCollTxt" : "createCollRequestTxt"}`)}/>

                </div>}
            </div>
        );
    }

    unknownOrganisation = () => {
        return (
            <div>
                <div className="institution warning">
                    <CriticalIcon/>
                    <p>{I18n.t("welcome.institutionNotConnected")}</p>
                </div>
                <h1>{I18n.t("welcome.whatYouCanDo")}</h1>
                <h3 className="step">
                    <span>1.</span>
                    <span>{I18n.t("welcome.contact")}</span>
                </h3>
                <p dangerouslySetInnerHTML={{__html: I18n.t("welcome.contactInfo")}}/>
            </div>
        );
    }

    render() {
        const {user} = this.props;
        const {organisation, loading, idpDisplayName} = this.state;

        if (loading) {
            return <SpinnerField/>;
        }

        const orphanUser = isEmpty(organisation);
        return (
            <div className="mod-welcome-container">
                <div className="mod-welcome">
                    <h1>{I18n.t("welcome.title", {name: user.given_name || user.name || I18n.t("welcome.mysterious")})}</h1>
                    <p>{I18n.t("welcome.subTitle")}</p>
                    <div className="institution">
                        <InformationIcon/>
                        <p dangerouslySetInnerHTML={{__html: I18n.t("welcome.institution", {name: idpDisplayName})}}/>
                    </div>
                    {orphanUser && this.unknownOrganisation()}
                    {!orphanUser && this.knownOrganisation(organisation)}
                </div>
            </div>
        );
    }
}

export default Welcome;