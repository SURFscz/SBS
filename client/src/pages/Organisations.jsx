import React from "react";
import {myOrganisations, searchOrganisations} from "../api";
import "./Organisations.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import debounce from "lodash.debounce";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../components/Button";
import Autocomplete from "../components/Autocomplete";
import {headerIcon} from "../forms/helpers";


class Organisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            sortedOrganisations: [],
            selected: -1,
            suggestions: [],
            query: "",
            loadingAutoComplete: false,
            moreToShow: false,
            sorted: "name",
            reverse: false,
            showMore: []
        }
    }

    componentDidMount = () =>
        myOrganisations()
            .then(json => {
                const {user} = this.props;
                json.forEach(org => {
                    const membership = org.organisation_memberships.find(m => m.user_id === user.id);
                    org.role = membership ? membership.role : "";
                });
                const {sorted, reverse} = this.state;
                const organisations = this.sortOrganisations(json, sorted, reverse);
                this.setState({organisations: organisations, sortedOrganisations: organisations})
            });

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
        searchOrganisations(this.state.query).then(results => this.setState({
            suggestions: results.length > 15 ? results.slice(0, results.length - 1) : results,
            loadingAutoComplete: false,
            moreToShow: results.length > 15 && this.state.query !== "*"
        })), 200);

    itemSelected = organisation => {
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    openInvitation = invitation => e => {
        stopEvent(e);
        this.props.history.push(`/organisation-invitations/${invitation.id}`);
    };

    renderCollaborations = organisations => {
        const collaborations = organisations.map(organisation => organisation.collaborations)
            .flat().filter(item => item !== undefined);
        const showMore = collaborations.length >= 6;
        const showMoreItems = this.state.showMore.includes("collaborations");

        return (
            <section className="info-block ">
                <div className="header organisation-collaborations">
                    <span className="type">{I18n.t("organisations.collaborations")}</span>
                    <span className="counter">{collaborations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? collaborations.slice(0, 5) : collaborations)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((collaboration, i) =>
                            <div className="organisation-collaborations" key={i}>
                                <a href={`/collaborations/${collaboration.id}`}
                                   onClick={this.openCollaboration(collaboration)}>
                                    <span>{collaboration.name}</span>
                                    <span
                                        className="count">{`(${collaboration.collaboration_memberships.length})`}</span>
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

    renderMembers = organisations => {
        const memberships = organisations.map(organisation => organisation.organisation_memberships)
            .flat().filter(item => !isEmpty(item));
        const showMore = organisations.length >= 6;
        const showMoreItems = this.state.showMore.includes("members");
        return (
            <section className="info-block ">
                <div className="header organisation-members">
                    <span className="type">{I18n.t("organisations.members")}</span>
                    <span className="counter">{memberships.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? organisations.slice(0, 5) : organisations)
                        .sort((s1, s2) => s1.name.localeCompare(s2.name))
                        .map((organisation, i) =>
                        <div className="organisation-members" key={i}>
                            <a href={`/organisations/${organisation.id}`}
                               onClick={this.openOrganisation(organisation)}>
                                <span>{organisation.name}</span>
                                <span className="count">{`(${organisation.organisation_memberships.length})`}</span>
                            </a>
                        </div>)}
                </div>
                {showMore && <section className="show-more">
                    <Button className="white"
                            txt={showMoreItems ? I18n.t("forms.hideSome") : I18n.t("forms.showMore")}
                            onClick={this.toggleShowMore("members")}/>
                </section>}
            </section>
        );
    };

    renderOrganisationInvitations = organisations => {
        const invitations = organisations.map(organisation => organisation.organisation_invitations)
            .flat().filter(item => !isEmpty(item));
        const showMore = invitations.length >= 6;
        const showMoreItems = this.state.showMore.includes("invitations");
        return (
            <section className="info-block ">
                <div className="header organisation-invitations">
                    <span className="type">{I18n.t("organisations.invitations")}</span>
                    <span className="counter">{invitations.length}</span>
                </div>
                <div className="content">
                    {(showMore && !showMoreItems ? invitations.slice(0, 5) : invitations)
                        .sort((i1, i2) => i1.invitee_email.localeCompare(i2.invitee_email))
                        .map((invitation, i) =>
                        <div className="organisation-invitations" key={i}>
                            <a href={`/organisation-invitations/${invitation.id}`}
                               onClick={this.openInvitation(invitation)}>
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

    sortTable = (organisations, name, sorted, reverse) => () => {
        if (name === "actions") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedOrganisations = this.sortOrganisations(organisations, name, reversed);
        this.setState({sortedOrganisations: sortedOrganisations, sorted: name, reverse: reversed});
    };

    sortOrganisations = (organisations, name, reverse) => [...organisations].sort((a, b) => {
        const aSafe = a[name] || "";
        const bSafe = b[name] || "";
        return aSafe.toString().localeCompare(bSafe.toString()) * (reverse ? -1 : 1);
    });

    getOrganisationValue = (organisation, user, name) => {
        if (name === "actions") {
            return <FontAwesomeIcon icon="arrow-right"/>
        }
        return organisation[name];
    };

    renderOrganisationRow = (organisation, user, names) => {
        return (
            <tr key={organisation.id} onClick={this.openOrganisation(organisation)}>
                {names.map(name => <td key={name}
                                       className={name}>{this.getOrganisationValue(organisation, user, name)}</td>)}
            </tr>
        );
    };

    renderOrganisations = (organisations, user, sorted, reverse) => {
        const names = ["actions", "name", "tenant_identifier", "role", "description"];
        return (
            <section className="organisation-list">
                <table>
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(organisations, name, sorted, reverse)}>
                                {I18n.t(`organisation.${name}`)}
                                {headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {organisations.map(organisation => this.renderOrganisationRow(organisation, user, names))}
                    </tbody>
                </table>
            </section>
        );
    };

    newOrganisation = () => {
        this.props.history.push("new-organisation")
    };

    onBlurSearch = suggestions => () => {
        if (!isEmpty(suggestions)) {
            setTimeout(() => this.setState({suggestions: [], loadingAutoComplete: true}), 250);
        } else {
            this.setState({suggestions: [], loadingAutoComplete: true});
        }
    };


    renderSearch = (organisations, user, query, loadingAutoComplete, suggestions, moreToShow, selected) => {
        const adminClassName = user.admin ? "with-button" : "";
        const showAutoCompletes = (query.length > 1 || "*" === query.trim()) && !loadingAutoComplete;
        const isAdmin = user.admin;

        return (
            <section className="organisation-search">
                <div className="search"
                     tabIndex="1" onBlur={this.onBlurSearch(suggestions)}>
                    <input type="text"
                           className={adminClassName}
                           onChange={this.search}
                           value={query}
                           onKeyDown={this.onSearchKeyDown}
                           placeholder={I18n.t("organisations.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin && <Button onClick={this.newOrganisation}
                                        txt={I18n.t("collaborations.add")}/>
                    }
                </div>
                {showAutoCompletes && <Autocomplete suggestions={suggestions}
                                                    query={query}
                                                    selected={selected}
                                                    itemSelected={this.itemSelected}
                                                    moreToShow={moreToShow}
                                                    entityName="organisations"/>}

            </section>

        );
    };

    render() {
        const {organisations, sortedOrganisations, query, loadingAutoComplete, suggestions, moreToShow, selected, sorted, reverse} = this.state;
        const {user} = this.props;
        return (
            <div className="mod-organisations">
                {this.renderSearch(organisations, user, query, loadingAutoComplete, suggestions, moreToShow, selected)}
                <div className="title">
                    <span>{I18n.t("organisations.dashboard")}</span>
                </div>
                <section className="info-block-container">
                    {this.renderCollaborations(organisations)}
                    {this.renderMembers(organisations)}
                    {this.renderOrganisationInvitations(organisations)}
                </section>
                <div className="title">
                    <span>{I18n.t("organisations.title")}</span>
                </div>
                {this.renderOrganisations(sortedOrganisations, user, sorted, reverse)}
            </div>);
    }
}

export default Organisations;