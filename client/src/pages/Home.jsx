import React from "react";
import "./Home.scss";
import I18n from "i18n-js";
import {myCollaborationsLite} from "../api";
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

    openService = service => e => {
        stopEvent(e);
        this.props.history.push(`/services/${service.id}`);
    };

    openGroup = (collaborations, group) => e => {
        stopEvent(e);
        const collaboration_id = collaborations.find(collaboration => collaboration.groups.find(g => g.id === group.id)).id;
        this.props.history.push(`/collaboration-group-details/${collaboration_id}/${group.id}`);
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

    renderServices = collaborations => {
        const services = collaborations.map(collaboration => collaboration.services).flat();
        const showMore = services.length >= 6;
        const showMoreItems = this.state.showMore.includes("services");
        return (
            <section className="info-block ">
                <div className="header services">
                    <span className="type">{I18n.t("home.services")}</span>
                    <span className="counter">{services.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? services.slice(0, 5) : services).map((service, i) =>
                        <div className="service" key={i}>
                            <a href={`/services/${service.id}`}
                               onClick={this.openService(service)}>
                                <FontAwesomeIcon icon={"arrow-right"}/>
                                <span>{service.name}</span>
                            </a>
                        </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("services")}/>
                </section>}
            </section>
        );
    };

    renderGroups = collaborations => {
        const groups = collaborations.map(collaboration => collaboration.groups).flat();
        const showMore = groups.length >= 6;
        const showMoreItems = this.state.showMore.includes("groups");
        return (
            <section className="info-block ">
                <div className="header groups">
                    <span className="type">{I18n.t("home.groups")}</span>
                    <span className="counter">{groups.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? groups.slice(0, 5) : groups).map((group, i) =>
                        <div className="group" key={i}>
                            <a href={`/groups/${group.id}`}
                               onClick={this.openGroup(collaborations, group)}>
                                <FontAwesomeIcon icon={"arrow-right"}/>
                                <span>{group.name}</span>
                            </a>
                        </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("group")}/>
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

    collaborationRequest = e => {
        stopEvent(e);
        this.props.history.push("new-collaboration");
        // this.props.history.push("request-collaboration");
    };

    render() {
        const {collaborations} = this.state;
        const {user} = this.props;
        const allowedCollaborationRequest = !user.admin && isEmpty(user.organisation_memberships);
        const hasOrganisationMemberships = !isEmpty(user.organisation_memberships);
        return (
            <div className="mod-home-container">
                <div className="mod-home">
                    <div className="title">
                        <p>{I18n.t("home.title")}</p>
                    </div>
                    <section className={"info-block-container"}>
                        {hasOrganisationMemberships && this.renderOrganisations(user)}
                        {this.renderCollaborations(collaborations)}
                        {this.renderServices(collaborations)}
                        {this.renderGroups(collaborations)}
                    </section>
                    {allowedCollaborationRequest &&
                    <Button className="collaboration-request" onClick={this.collaborationRequest} txt={I18n.t("home.collaborationRequest")}/>}
                </div>
            </div>);
    };
}

export default Home;