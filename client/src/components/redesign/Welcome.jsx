import React from "react";
import "./Welcome.scss";
import I18n from "../../locale/I18n";
import {identityProviderDisplayName, organisationsByUserSchacHomeOrganisation} from "../../api";
import {getSchacHomeOrg, isEmpty} from "../../utils/Utils";
import SpinnerField from "./SpinnerField";
import "react-mde/lib/styles/css/react-mde-all.css";
import Button from "../Button";
import {AppStore} from "../../stores/AppStore";
import {convertToHtml} from "../../utils/Markdown";
import {rawGlobalUserRole, ROLES} from "../../utils/UserRole";
import DOMPurify from "dompurify";
import LandingInfo from "../LandingInfo";

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
        const {user} = this.props;
        const role = rawGlobalUserRole(user);
        if (role !== ROLES.USER || !isEmpty(user.collaboration_requests) || !isEmpty(user.join_requests)) {
            this.props.history.push("/home");
            return;
        }
        Promise.all([organisationsByUserSchacHomeOrganisation(), identityProviderDisplayName()])
            .then(res => {
                this.setState({
                    organisation: getSchacHomeOrg(user, res[0]),
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

    knownOrganisation = (idpDisplayName, organisation) => {
        const hasOnBoardingMsg = !isEmpty(organisation.on_boarding_msg);
        const canCreate = organisation.collaboration_creation_allowed_entitlement || organisation.collaboration_creation_allowed;
        return (
            <div>
                <h2>{I18n.t("welcome.creating")}</h2>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t(`welcome.${canCreate ? "startCreateColl" : "startRequestColl"}`,
                        {name: idpDisplayName}))
                }}/>
                {hasOnBoardingMsg &&
                    <div>
                        <h2 dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("welcome.instructions", {name: organisation.name}))
                        }}/>
                        <div className="instructions mde-preview">
                            <div className="mde-preview-content">
                                <p dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(convertToHtml(organisation.on_boarding_msg))
                                }}/>
                            </div>
                        </div>
                    </div>}
                <Button onClick={() => this.props.history.push("/new-collaboration")}
                        txt={I18n.t(`welcome.${canCreate ? "createCollTxt" : "createCollRequestTxt"}`)}/>

            </div>
        );
    }

    unknownOrganisation = idpDisplayName => {
        return (
            <div>
                <h2>{I18n.t("welcome.creating")}</h2>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcome.institutionCollNotAllowed", {name: idpDisplayName}))}}/>
            </div>
        );
    }

    render() {
        const {user} = this.props;
        const {organisation, loading, idpDisplayName} = this.state;

        if (loading) {
            return <SpinnerField/>;
        }

        const orphanUser = isEmpty(organisation) || !organisation.has_members;
        return (
            <>
                <div className="mod-welcome-container">
                    <div className="mod-welcome">
                        <h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcome.title", {name: user.given_name || user.name || I18n.t("welcome.mysterious")}))}}/>
                        <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcome.subTitle"))}}/>
                        <h2>{I18n.t("welcome.joining")}</h2>
                        <p>{I18n.t("welcome.invited")}</p>
                        {orphanUser && this.unknownOrganisation(idpDisplayName)}
                        {!orphanUser && this.knownOrganisation(idpDisplayName, organisation)}
                    </div>
                </div>
                <LandingInfo/>
            </>
        );
    }
}

export default Welcome;