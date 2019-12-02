import React from "react";
import "./Home.scss";
import I18n from "i18n-js";
import { myCollaborationsLite} from "../api";
import {isEmpty, stopEvent} from "../utils/Utils";
import Button from "../components/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaborations: [],
            showMore: []
        };
    }

    componentDidMount = () => {
         myCollaborationsLite()
            .then(res => {
                this.setState({collaborations: res});
            });
    };

    toggleShowMore = name => e => {
        stopEvent(e);
        const {showMore} = this.state;
        const newShowMore = showMore.includes(name) ? showMore.filter(item => item !== name) : showMore.concat([name]);
        this.setState({showMore: newShowMore});
    };

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    renderCollaborationName = collaboration => {
        const name = collaboration.name;
        const shortNameOrg = collaboration.organisation.short_name;
        const shortNameOrgValid = isEmpty(shortNameOrg) ? "" : ` [${collaboration.organisation.short_name}]`;
        return `${name} ${shortNameOrgValid}`;
    };

    renderCollaborations = collaborations => {
        const showMore = collaborations.length >= 6;
        const showMoreItems = this.state.showMore.includes("collaborations");
        return (
            <section className="info-block ">
                <div className="header collaborations">
                    <span className="type">{I18n.t("home.collaborations")}</span>
                    <span className="counter">{collaborations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? collaborations.slice(0, 5) : collaborations)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((collaboration, i) =>
                        <div className="collaboration" key={i}>
                            <a href={`/collaborations/${collaboration.id}`}
                               onClick={this.openCollaboration(collaboration)}>
                                <FontAwesomeIcon icon={"arrow-right"}/>
                                <span>{this.renderCollaborationName(collaboration)}</span>
                            </a>
                        </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("collaborations")}/>
                </section>}
            </section>
        );
    };

    renderOrganisations = user => {
        const organisations = user.organisation_memberships.map(organisationMembership => organisationMembership.organisation);
        const showMore = organisations.length >= 6;
        const showMoreItems = this.state.showMore.includes("organisations");
        return (
            <section className="info-block ">
                <div className="header organisations">
                    <span className="type">{I18n.t("home.organisations")}</span>
                    <span className="counter">{organisations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? organisations.slice(0, 5) : organisations).map((organisation, i) =>
                        <div className="organisation" key={i}>
                            <a href={`/organisations/${organisation.id}`}
                               onClick={this.openOrganisation(organisation)}>
                                <FontAwesomeIcon icon={"arrow-right"}/>
                                <span>{organisation.name}</span>
                            </a>
                        </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("organisations")}/>
                </section>}
            </section>
        );
    };

    render() {
        const {collaborations} = this.state;
        const {user} = this.props;
        const hasOrganisationMemberships = !isEmpty(user.organisation_memberships);
        return (
            <div className="mod-home">
                <div className="title">
                    <p>{I18n.t("home.title")}</p>
                </div>
                <section className={`info-block-container ${hasOrganisationMemberships ? "with-organisations" : ""}`}>
                    {hasOrganisationMemberships && this.renderOrganisations(user)}
                    {this.renderCollaborations(collaborations)}
                </section>
            </div>);
    };
}

export default Home;