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
            groups: [],
            showMore: []
        };
    }

    componentDidMount = () => {
        myCollaborationsLite()
            .then(res => {
                const collaborationMemberships = res.map(coll => (coll.collaboration_memberships || [])).flat();
                const groupsFromMemberships = collaborationMemberships.map(collaborationMembership => (collaborationMembership.groups || [])).flat();
                const groupIds = [...new Set(groupsFromMemberships.map(group => group.id))];
                const groups = groupsFromMemberships.filter(group => groupIds.includes(group.id));

                this.setState({collaborations: res, groups: groups});
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

    openGroup = (group) => e => {
        stopEvent(e);
        this.props.history.push(`/collaboration-group-details/${group.collaboration_id}/${group.id}`);
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

    renderHeader = (name, collection, allowedLink) => {
        return <div className={`header ${name} ${allowedLink ? 'link' : ''}`}
                    onClick={() => allowedLink && this.props.history.push(`/${name}`)}>
            {allowedLink && <FontAwesomeIcon icon={"arrow-right"}/>}
            <span className="type">{I18n.t(`home.${name}`)}</span>
            <span className="counter">{collection.length}</span>
        </div>

    };

    renderCollaborations = collaborations => {
        const showMore = collaborations.length >= 6;
        const showMoreItems = this.state.showMore.includes("collaborations");
        const {user} = this.props;
        const linkAllowed = user.admin || user.collaboration_memberships.find(membership => membership.role === "admin");
        return (
            <section className="info-block ">
                {this.renderHeader("collaborations", collaborations, linkAllowed)}
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
        const allServices = collaborations.map(collaboration => collaboration.services).flat();
        const distinctServiceIdentifiers = [...new Set(allServices.map(s => s.id))];
        const services = distinctServiceIdentifiers.map(id => allServices.find(s => s.id === id));
        const showMore = services.length >= 6;
        const showMoreItems = this.state.showMore.includes("services");
        return (
            <section className="info-block ">
                {this.renderHeader("services", services, this.props.user.admin)}
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

    renderGroups = groups => {
        const showMore = groups.length >= 6;
        const showMoreItems = this.state.showMore.includes("groups");
        return (
            <section className="info-block ">
                {this.renderHeader("groups", groups, false)}
                <div className="content">
                    {(showMore && !showMoreItems ? groups.slice(0, 5) : groups).map((group, i) =>
                        <div className="group" key={i}>
                            <a href={`/groups/${group.id}`}
                               onClick={this.openGroup(group)}>
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
        const linkAllowed = user.admin || !isEmpty(user.organisation_memberships);
        return (
            <section className="info-block ">
                {this.renderHeader("organisations", organisations, linkAllowed)}
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
        const hasOrganisationMemberships = !isEmpty(user.organisation_memberships) || user.admin;
        return (
            <div className="mod-home-container">
                <div className="mod-home">
                    <div className="title top">
                        <p>{I18n.t("home.title")}</p>
                    </div>
                    <section className={"info-block-container"}>
                        {hasOrganisationMemberships && this.renderOrganisations(user)}
                        {this.renderCollaborations(collaborations)}
                        {this.renderServices(collaborations)}
                    </section>
                </div>
            </div>);
    };
}

export default Home;