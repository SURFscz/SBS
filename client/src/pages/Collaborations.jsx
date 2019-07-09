import React from "react";
import {myCollaborations, myCollaborationsLite, searchCollaborations} from "../api";
import I18n from "i18n-js";
import debounce from "lodash.debounce";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import "./Collaborations.scss";
import Button from "../components/Button";
import {isEmpty, stopEvent} from "../utils/Utils";
import Autocomplete from "../components/Autocomplete";
import {headerIcon} from "../forms/helpers";
import ReactTooltip from "react-tooltip";

class Collaborations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaborations: [],
            sortedCollaborations: [],
            selected: -1,
            suggestions: [],
            query: "",
            loadingAutoComplete: false,
            moreToShow: false,
            sorted: "name",
            reverse: false,
            showMore: [],
            isCollaborationAdmin: false
        }
    }

    componentDidMount = () => {
        const {user} = this.props;
        const isCollaborationAdmin = (user.collaboration_memberships || []).some(membership => membership.role === "admin");
        const isOrganisationAdmin = (user.organisation_memberships || []).some(membership => membership.role === "admin");
        const isAdmin = user.admin;
        if (!isCollaborationAdmin && !isAdmin && !isOrganisationAdmin) {
            return this.props.history.push("/404");
        }
        const promises = isCollaborationAdmin ? [myCollaborations(), myCollaborationsLite()] : [myCollaborations()];
        Promise.all(promises)
            .then(res => {
                const myCollaborations = res[0];
                const collaborationsLite = (isCollaborationAdmin ? res[1] : [])
                    .filter(coll => !myCollaborations.find(collaboration => collaboration.id === coll.id));
                const collaborations = myCollaborations.concat(collaborationsLite);
                collaborations.forEach(coll => {
                    const membership = (coll.collaboration_memberships || []).find(m => m.user_id === user.id);
                    coll.role = membership ? membership.role : "member";
                    coll.organisation_name = coll.organisation.name;
                });
                const {sorted, reverse} = this.state;
                const sortedCollaborations = this.sortCollaborations(collaborations, sorted, reverse);
                this.setState({
                    collaborations: sortedCollaborations,
                    sortedCollaborations: sortedCollaborations,
                    isCollaborationAdmin: isCollaborationAdmin
                })
            });
    };

    newCollaboration = () => {
        this.props.history.push("new-collaboration");
    };


    onSearchKeyDown = e => {
        const {suggestions, selected} = this.state;
        if (e.keyCode === 40 && selected < (suggestions.length - 1)) {//keyDown
            stopEvent(e);
            this.setState({selected: (selected + 1)});
        }
        if (e.keyCode === 38 && selected >= 0) {//keyUp
            stopEvent(e);
            this.setState({selected: (selected - 1)});
        }
        if (e.keyCode === 13 && selected >= 0) {//enter
            stopEvent(e);
            this.setState({selected: -1}, () => this.itemSelected(suggestions[selected]));
        }
        if (e.keyCode === 27) {//escape
            stopEvent(e);
            this.setState({selected: -1, query: "", suggestions: []});
        }

    };

    toggleShowMore = name => e => {
        stopEvent(e);
        const {showMore} = this.state;
        const newShowMore = showMore.includes(name) ? showMore.filter(item => item !== name) : showMore.concat([name]);
        this.setState({showMore: newShowMore});
    };

    search = e => {
        const query = e.target.value;
        this.setState({query: query, selected: -1});
        if ((!isEmpty(query) && query.trim().length > 2) || "*" === query.trim()) {
            this.setState({loadingAutoComplete: true});
            this.delayedAutocomplete();
        }
    };

    delayedAutocomplete = debounce(() =>
        searchCollaborations(this.state.query).then(results => this.setState({
            suggestions: results.length > 15 ? results.slice(0, results.length - 1) : results,
            loadingAutoComplete: false,
            moreToShow: results.length > 15 && this.state.query !== "*"
        })), 200);

    itemSelected = collaboration => this.props.history.push(`/collaborations/${collaboration.id}`);

    onBlurSearch = suggestions => () => {
        if (!isEmpty(suggestions)) {
            setTimeout(() => this.setState({suggestions: [], loadingAutoComplete: true}), 250);
        } else {
            this.setState({suggestions: [], loadingAutoComplete: true});
        }
    };

    openJoinRequest = joinRequest => e => {
        stopEvent(e);
        this.props.history.push(`/join-requests/${joinRequest.hash}`);
    };

    openInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/invitations/${invitation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    renderRequests = joinRequests => {
        const showMore = joinRequests.length >= 6;
        const showMoreItems = this.state.showMore.includes("joinRequests");
        return (
            <section className="info-block ">
                <div className="header join-requests">
                    <span className="type">{I18n.t("collaborations.requests")}</span>
                    <span className="counter">{joinRequests.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? joinRequests.slice(0, 5) : joinRequests)
                        .sort((r1, r2) => r1.user.name.localeCompare(r2.user.name))
                        .map((request, i) =>
                            <div className="join-request" key={i}>
                                <a href={`/join-requests/${request.hash}`} onClick={this.openJoinRequest(request)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{request.user.name}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("joinRequests")}/>
                </section>}
            </section>
        );
    };

    renderAuthorisations = collaborations => {
        const authorisationGroups = collaborations.map(collaboration => collaboration.authorisation_groups)
            .flat().filter(item => !isEmpty(item));
        const showMore = collaborations.length >= 6;
        const showMoreItems = this.state.showMore.includes("authorisationGroups");

        return (
            <section className="info-block ">
                <div className="header authorisations">
                    <span className="type">{I18n.t("collaborations.authorisations")}</span>
                    <span className="counter">{authorisationGroups.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? collaborations.slice(0, 5) : collaborations)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((collaboration, i) =>
                            <div className="collaboration-authorisations" key={i}>
                                <a href={`/collaborations/${collaboration.id}`}
                                   onClick={this.openCollaboration(collaboration)}>
                                    <span>{collaboration.name}</span>
                                    <span className="count">{`(${collaboration.authorisation_groups.length})`}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("authorisationGroups")}/>
                </section>}
            </section>
        );
    };

    renderInvitations = invitations => {
        const showMore = invitations.length >= 6;
        const showMoreItems = this.state.showMore.includes("invitations");
        return (
            <section className="info-block ">
                <div className="header invitations">
                    <span className="type">{I18n.t("collaborations.invitations")}</span>
                    <span className="counter">{invitations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? invitations.slice(0, 5) : invitations)
                        .sort((i1, i2) => i1.invitee_email.localeCompare(i2.invitee_email))
                        .map((invitation, i) =>
                            <div className="invitation" key={i}>
                                <a href={`/invitations/${invitation.id}`} onClick={this.openInvitation(invitation)}>
                                    <FontAwesomeIcon icon={"arrow-right"}/>
                                    <span>{invitation.invitee_email}</span>
                                </a>
                            </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("invitations")}/>
                </section>}

            </section>
        );
    };

    renderServices = collaborations => {

        const services = collaborations.map(collaboration => collaboration.services)
            .flat().filter(item => !isEmpty(item));
        const showMore = collaborations.length >= 6;
        const showMoreItems = this.state.showMore.includes("services");
        return (
            <section className="info-block ">
                <div className="header services">
                    <span className="type">{I18n.t("collaborations.services")}</span>
                    <span className="counter">{services.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? collaborations.slice(0, 5) : collaborations)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((collaboration, i) =>
                            <div className="collaboration-services" key={i}>
                                <a href={`/collaborations/${collaboration.id}`}
                                   onClick={this.openCollaboration(collaboration)}>
                                    <span>{collaboration.name}</span>
                                    <span className="count">{`(${collaboration.services.length})`}</span>
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

    sortTable = (collaborations, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedCollaborations = this.sortCollaborations(collaborations, name, reversed);
        this.setState({sortedCollaborations: sortedCollaborations, sorted: name, reverse: reversed});
    };

    sortCollaborations = (collaborations, name, reverse) => {
        const result = [...collaborations].sort((a, b) => {
            const aSafe = a[name] || "";
            const bSafe = b[name] || "";
            return aSafe.toString().localeCompare(bSafe.toString()) * (reverse ? -1 : 1);
        });
        return result;
    };

    getCollaborationValue = (collaboration, user, name) => {
        if (name === "actions") {
            return <FontAwesomeIcon icon="arrow-right"/>;
        }
        return collaboration[name];
    };

    renderCollaborationRow = (collaboration, user, names) => {
        return (
            <tr key={collaboration.id} onClick={this.openCollaboration(collaboration)}>
                {names.map(name => <td className={name}
                                       key={name}>{this.getCollaborationValue(collaboration, user, name)}</td>)}
            </tr>
        );
    };

    renderCollaborations = (collaborations, user, sorted, reverse) => {
        const names = ["actions", "name", "role", "description", "access_type", "enrollment", "organisation_name", "accepted_user_policy"];
        return (
            <section className="collaboration-list">
                <table>
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(collaborations, name, sorted, reverse)}>
                                {I18n.t(`collaboration.${name}`)}
                                {headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {collaborations.map(collaboration => this.renderCollaborationRow(collaboration, user, names))}
                    </tbody>
                </table>
            </section>
        );
    };


    renderSearch = (user, query, loadingAutoComplete, suggestions, moreToShow, selected, isOrganisationAdmin) => {
        const adminClassName = (user.admin || isOrganisationAdmin) ? "with-button" : "";
        const showAutoCompletes = (query.length > 1 || "*" === query.trim()) && !loadingAutoComplete;

        return (
            <section className="collaboration-search">
                <div className="search"
                     tabIndex="1" onBlur={this.onBlurSearch(suggestions)}>
                    <input type="text"
                           className={adminClassName}
                           onChange={this.search}
                           value={query}
                           onKeyDown={this.onSearchKeyDown}
                           placeholder={I18n.t("collaborations.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {(user.admin || isOrganisationAdmin) && <Button onClick={this.newCollaboration}
                                                                    txt={I18n.t("collaborations.add")}/>
                    }
                </div>
                {showAutoCompletes && <Autocomplete suggestions={suggestions}
                                                    query={query}
                                                    selected={selected}
                                                    itemSelected={this.itemSelected}
                                                    moreToShow={moreToShow}
                                                    entityName="collaborations"/>}

            </section>

        );
    };

    render() {
        const {user} = this.props;
        const {collaborations, sortedCollaborations, query, loadingAutoComplete, suggestions, moreToShow,
            selected, sorted, reverse} = this.state;
        const adminCollaborations = user.admin ? collaborations : collaborations.filter(coll => coll.role !== "member");
        const isOrganisationAdmin = (user.organisation_memberships || []).some(membership => membership.role === "admin");
        return (
            <div className="mod-collaborations">
                {user.admin &&
                this.renderSearch(user, query, loadingAutoComplete, suggestions, moreToShow, selected, isOrganisationAdmin)}
                {user.admin && <div className="title">
                    <span>{I18n.t("collaborations.dashboard")}</span>
                </div>}
                {!user.admin && <div className="title">
                    <span>{I18n.t("collaborations.dashboardAdmin")}</span>
                    <span data-tip data-for="dashboard-admin">
                                <FontAwesomeIcon icon="info-circle"/>
                                <ReactTooltip id="dashboard-admin" type="light" effect="solid" data-html={true}>
                                    <p dangerouslySetInnerHTML={{__html: I18n.t("collaborations.dashboardAdminTooltip")}}/>
                                </ReactTooltip>
                            </span>
                </div>}


                <section className="info-block-container">
                    {this.renderRequests(adminCollaborations.map(collaboration => collaboration.join_requests)
                        .flat().filter(item => !isEmpty(item)))}
                    {this.renderInvitations(adminCollaborations.map(collaboration => collaboration.invitations)
                        .flat().filter(item => !isEmpty(item)))}
                    {this.renderServices(adminCollaborations)}
                    {this.renderAuthorisations(adminCollaborations)}
                </section>
                <div className="title">
                    <span>{I18n.t("collaborations.title")}</span>
                    {(isOrganisationAdmin && !user.admin) && <Button onClick={this.newCollaboration}
                                                                     txt={I18n.t("collaborations.add")}/>
                    }
                </div>
                {this.renderCollaborations(sortedCollaborations, user, sorted, reverse)}
            </div>);
    }
}

export default Collaborations;