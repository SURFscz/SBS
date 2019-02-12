import React from "react";
import "./Home.scss";
import I18n from "i18n-js";
import {myCollaborationMemberships, myCollaborationsLite} from "../api";
import {stopEvent} from "../utils/Utils";
import Button from "../components/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class Home extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaborationMemberships: [],
            collaborations: [],
            showMore: []
        };
    }

    componentDidMount = () => {
        Promise.all([myCollaborationMemberships(), myCollaborationsLite()])
            .then(res => {
                this.setState({collaborationMemberships: res[0], collaborations: res[1]});
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
        this.props.history.push(`/collaboration-authorisation-group-details/${authorisationGroup.collaboration.id}/${authorisationGroup.id}`);
    };


    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    authorisationGroupForUserServiceProfile = (userServiceProfile, authorisationGroups) =>
        authorisationGroups.find(authorisationGroup => authorisationGroup.id === userServiceProfile.authorisation_group_id);

    renderUserProfileServices = (userServiceProfiles, authorisationGroups) => {
        const showMore = userServiceProfiles.length >= 6;
        const showMoreItems = this.state.showMore.includes("userServiceProfiles");
        return (
            <section className="info-block ">
                <div className="header user-service-profiles">
                    <span className="type">{I18n.t("home.userServiceProfiles")}</span>
                    <span className="counter">{userServiceProfiles.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? userServiceProfiles.slice(0, 5) : userServiceProfiles).map((userServiceProfile, i) =>
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
                    {(showMore && !showMoreItems ? authorisationGroups.slice(0, 5) : authorisationGroups).map((authorisationGroup, i) =>
                        <div className="authorisation" key={i}>
                            <a href={`/collaboration-authorisation-group-details/${authorisationGroup.collaboration.id}/${authorisationGroup.id}`}
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
                    {(showMore && !showMoreItems ? collaborations.slice(0, 5) : collaborations).map((collaboration, i) =>
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

    render() {
        const {collaborationMemberships, collaborations} = this.state;

        const authorisationGroups = collaborationMemberships.map(membership => membership.authorisation_groups).flat();
        const userServiceProfiles = authorisationGroups.map(authorisationGroup => authorisationGroup.user_service_profiles).flat();
        return (
            <div className="mod-home">
                <div className="title">
                    <p>{I18n.t("home.title")}</p>
                </div>
                <section className="info-block-container">
                    {this.renderUserProfileServices(userServiceProfiles, authorisationGroups)}
                    {this.renderAuthorisationGroups(authorisationGroups)}
                    {this.renderCollaborations(collaborations)}

                </section>
            </div>);
    };
}

export default Home;