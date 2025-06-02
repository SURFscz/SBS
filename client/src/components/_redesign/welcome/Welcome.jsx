import React from "react";
import "./Welcome.scss";
import I18n from "../../../locale/I18n";
import {identityProviderDisplayName} from "../../../api";
import {capitalize, isEmpty, stopEvent} from "../../../utils/Utils";
import SpinnerField from "../spinner-field/SpinnerField";
import "react-mde/lib/styles/css/react-mde-all.css";
import Button from "../../button/Button";
import {AppStore} from "../../../stores/AppStore";
import {getUserRequests, rawGlobalUserRole, ROLES} from "../../../utils/UserRole";
import DOMPurify from "dompurify";
import LandingInfo from "../../landing-info/LandingInfo";

class Welcome extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            idpDisplayName: I18n.t("_welcome.unknown"),
            loading: true,
            requests: []
        };
    }

    componentDidMount() {
        const {user} = this.props;
        this.setState({requests: getUserRequests(user)})
        const role = rawGlobalUserRole(user);
        if (role !== ROLES.USER) {
            this.props.history.push("/home");
            return;
        }
        identityProviderDisplayName()
            .then(res => {
                this.setState({
                    organisations: user.organisations_from_user_schac_home || [],
                    idpDisplayName: res ? res.display_name : this.state.idpDisplayName,
                    loading: false
                });
                AppStore.update(s => {
                    s.breadcrumb.paths = [
                        {path: "/", value: I18n.t("breadcrumb.home")}
                    ];
                });
            });
    }

    knownOrganisation = (idpDisplayName, organisations, requests) => {
        const canCreate = organisations.some(org => org.collaboration_creation_allowed_entitlement || org.collaboration_creation_allowed);
        return (
            <div>
                <h2>{I18n.t("_welcome.creating")}</h2>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t(`welcome.${canCreate ? "startCreateColl" : "startRequestColl"}`,
                        {name: idpDisplayName}))
                }}/>
                <div className="known-organisation">
                    <Button onClick={() => this.props.history.push("/new-collaboration")}
                            txt={I18n.t(`welcome.${canCreate ? "createCollTxt" : "createCollRequestTxt"}`)}/>
                    {!isEmpty(requests) &&
                        <a href="#" onClick={this.showRequests}>{I18n.t("collaborationsOverview.viewRequests")}</a>
                    }
                </div>

            </div>
        );
    }

    unknownOrganisation = (idpDisplayName, requests) => {
        return (
            <div>
                <h2>{I18n.t("_welcome.creating")}</h2>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("_welcome.institutionCollNotAllowed", {name: idpDisplayName}))}}/>
                {!isEmpty(requests) && <div className="unknown-organisation">
                    <Button onClick={this.showRequests}
                            txt={capitalize( I18n.t("collaborationsOverview.viewRequests"))}/>
                </div>

                }
            </div>
        );
    }

    showRequests = e => {
        stopEvent(e);
        this.props.history.push("/my-requests");
    }

    render() {
        const {user} = this.props;
        const {organisations, loading, idpDisplayName, requests} = this.state;

        if (loading) {
            return <SpinnerField/>;
        }

        const orphanUser = isEmpty(organisations) || organisations.every(org => !org.has_members);
        return (
            <>
                <div className="mod-welcome-container">
                    <div className="mod-welcome">
                        <h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("_welcome.title", {name: user.given_name || user.name || I18n.t("_welcome.mysterious")}))}}/>
                        <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("_welcome.subTitle"))}}/>
                        <h2>{I18n.t("_welcome.joining")}</h2>
                        <p>{I18n.t("_welcome.invited")}</p>
                        {orphanUser && this.unknownOrganisation(idpDisplayName, requests)}
                        {!orphanUser && this.knownOrganisation(idpDisplayName, organisations, requests)}

                    </div>
                </div>
                <LandingInfo/>
            </>
        );
    }
}

export default Welcome;
