import React from "react";
import "./Home.scss";
import I18n from "i18n-js";
import {myAuthorisationGroups, myCollaborationsLite} from "../api";
import {isEmpty, stopEvent} from "../utils/Utils";
import Button from "../components/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            authorisationGroups: [],
            collaborations: [],
            showMore: []
        };
    }

    componentDidMount = () => {
        Promise.all([myAuthorisationGroups(), myCollaborationsLite()])
            .then(res => {
                this.setState({authorisationGroups: res[0], collaborations: res[1]});
            });
    };

    toggleShowMore = name => e => {
        stopEvent(e);
        const {showMore} = this.state;
        const newShowMore = showMore.includes(name) ? showMore.filter(item => item !== name) : showMore.concat([name]);
        this.setState({showMore: newShowMore});
    };

    openUserServiceProfile = userServiceProfile => e => {
        stopEvent(e);
        this.props.history.push(`/user-service-profile-details/${userServiceProfile.id}`);
    };

    openUserServiceProfiles = e => {
        stopEvent(e);
        this.props.history.push("/user-service-profiles");
    };

    openAuthorisationGroup = authorisationGroup => e => {
        stopEvent(e);
        this.props.history.push(`/collaboration-authorisation-group-details/${authorisationGroup.collaboration_id}/${authorisationGroup.id}`);
    };

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    authorisationGroupForUserServiceProfile = (userServiceProfile, authorisationGroups) => {
        return authorisationGroups.find(authorisationGroup => authorisationGroup.id === userServiceProfile.authorisation_group_id);
    };

    renderUserProfileServices = (userServiceProfiles, authorisationGroups) => {
        const showMore = userServiceProfiles.length >= 6;
        const showMoreItems = this.state.showMore.includes("userServiceProfiles");
        return (
            <section className="info-block ">
                <div className="header user-service-profiles link" onClick={this.openUserServiceProfiles}>
                    <span className="type">{I18n.t("home.userServiceProfiles")}</span>
                    <span className="counter">{userServiceProfiles.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? userServiceProfiles.slice(0, 5) : userServiceProfiles)
                        .sort((i1, i2) => `${i1.service.name} - ${this.authorisationGroupForUserServiceProfile(i1, authorisationGroups).name}`
                            .localeCompare(`${i2.service.name} - ${this.authorisationGroupForUserServiceProfile(i2, authorisationGroups).name}`))
                        .map((userServiceProfile, i) =>
                            <div className="user-service-profile" key={i}>
                                <a href={`/user-service-profile/${userServiceProfile.id}`}
                                   onClick={this.openUserServiceProfile(userServiceProfile)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{`${userServiceProfile.service.name} - ${this.authorisationGroupForUserServiceProfile(userServiceProfile, authorisationGroups).name}`}</span>
                                </a>
                            </div>)}
                </div>
                <section className="show-more">
                    {showMore && <Button className="white"
                                         txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                                         onClick={this.toggleShowMore("userServiceProfiles")}/>}
                    {userServiceProfiles.length > 0 && <Button className="white"
                                                               txt={I18n.t("forms.manage")}
                                                               onClick={this.openUserServiceProfiles}/>}
                </section>
            </section>
        );
    };

    renderAuthorisationGroups = authorisationGroups => {
        const showMore = authorisationGroups.length >= 6;
        const showMoreItems = this.state.showMore.includes("authorisationGroups");
        return (
            <section className="info-block ">
                <div className="header authorisations">
                    <span className="type">{I18n.t("home.authorisationGroups")}</span>
                    <span className="counter">{authorisationGroups.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? authorisationGroups.slice(0, 5) : authorisationGroups)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((authorisationGroup, i) =>
                            <div className="authorisation" key={i}>
                                <a href={`/collaboration-authorisation-group-details/${authorisationGroup.collaboration_id}/${authorisationGroup.id}`}
                                   onClick={this.openAuthorisationGroup(authorisationGroup)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{authorisationGroup.name}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("userServiceProfiles")}/>
                </section>}
            </section>
        );
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
                                <span>{collaboration.name}</span>
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
        const {authorisationGroups, collaborations} = this.state;
        const {user} = this.props;
        const hasOrganisationMemberships = !isEmpty(user.organisation_memberships);
        const profiles = authorisationGroups.map(authorisationGroup => authorisationGroup.user_service_profiles).flat();
        const userServiceProfiles = [...new Set(profiles.map(p => p.id))].map(id => profiles.find(p => p.id === id));
        return (
            <div className="mod-home">
                <div className="title">
                    <p>{I18n.t("home.title")}</p>
                </div>
                <section className={`info-block-container ${hasOrganisationMemberships ? "with-organisations" : ""}`}>
                    {this.renderUserProfileServices(userServiceProfiles, authorisationGroups)}
                    {this.renderAuthorisationGroups(authorisationGroups)}
                    {this.renderCollaborations(collaborations)}
                    {hasOrganisationMemberships && this.renderOrganisations(user)}
                </section>
            </div>);
    };
}

export default Home;