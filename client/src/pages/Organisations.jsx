import React from "react";
import {myOrganisations, searchOrganisations} from "../api";
import "./Organisations.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import debounce from "lodash.debounce";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "./Organisations";
import Autocomplete from "../components/Autocomplete";


class Organisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            selected: -1,
            suggestions: [],
            query: "",
            loadingAutoComplete: false,
            moreToShow: false,
            sorted: "name",
            reverse: true,
        }
    }

    componentWillMount = () => {
        myOrganisations()
            .then(json => {
                this.setState({organisations: json});
            });
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
        // this.props.history.push(`/organisations/${organisation.id}`);
    };

    openOrganisation = organisation => e => {
        stopEvent(e);
        // this.props.history.push(`/organisations/${organisation.id}`);
    };

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    renderCollaborations = organisations => {
        const collaborations = organisations.map(organisation => organisation.collaborations).flat()
        return (
            <section className="info-block ">
                <div className="header organisation-collaborations">
                    <span className="type">{I18n.t("organisations.collaborations")}</span>
                    <span className="counter">{collaborations.length}</span>
                </div>
                <div className="content">
                    {collaborations.map((collaboration, i) =>
                        <div className="organisation-collaborations" key={i}>
                            <a href={`/collaborations/${collaboration.id}`}
                               onClick={this.openCollaboration(collaboration)}>
                                <span>{collaboration.name}</span>
                                <span className="count">{`(${collaboration.collaboration_memberships.length})`}</span>
                            </a>
                        </div>)}
                </div>
            </section>
        );
    };

    renderMembers = organisations => {
        const memberships = organisations.map(organisation => organisation.organisation_memberships).flat();
        return (
            <section className="info-block ">
                <div className="header organisation-members">
                    <span className="type">{I18n.t("organisations.members")}</span>
                    <span className="counter">{memberships.length}</span>
                </div>
                <div className="content">
                    {organisations.map((organisation, i) =>
                        <div className="organisation-members" key={i}>
                            <a href={`/organisations/${organisation.id}`}
                               onClick={this.openOrganisation(organisation)}>
                                <span>{organisation.name}</span>
                                <span className="count">{`(${organisation.organisation_memberships.length})`}</span>
                            </a>
                        </div>)}
                </div>

            </section>
        );
    };

    renderProfile = user => {
        return (
            <section className="info-block ">
                <div className="header profile">
                    <span className="type">{I18n.t("organisations.profile")}</span>
                </div>
                <div className="content profile">
                    <p>{user.uid}</p>
                    <p>{user.name}</p>
                    <p>{user.email}</p>
                </div>
            </section>
        );
    };

    headerIcon = (name, sorted, reverse) => {
        if (name === sorted) {
            return reverse ? <FontAwesomeIcon icon="arrow-up" className="reverse"/> :
                <FontAwesomeIcon icon="arrow-down" className="current"/>
        }
        return <FontAwesomeIcon icon="arrow-down"/>;
    };

    sortTable = (organisations, name, sorted, reverse) => () => {
        const reversed = (sorted === name ? !reverse : false);
        const sortedOrganisations = [...organisations].sort((a, b) => {
            const aSafe = a[name] || "";
            const bSafe = b[name] || "";
            return aSafe.toString().localeCompare(bSafe.toString()) * (reverse ? -1 : 1);
        });
        this.setState({organisations: sortedOrganisations, sorted: name, reverse: reversed});
    };

    getOrganisationValue = (organisation, user, name) => {
        switch (name) {
            case "role" : {
                const membership = organisation.organisation_memberships.find(m => m.user_id === user.id);
                return membership ? membership.role : "";
            }
            default:
                return organisation[name];
        }
    };

    renderOrganisationRow = (organisation, user, names) => {
        return (
            <tr key={organisation.id}>
                {names.map(name => <td key={name}>{this.getOrganisationValue(organisation, user, name)}</td>)}
            </tr>
        );
    };

    renderOrganisations = (organisations, user, sorted, reverse) => {
        const names = ["name", "role", "description"];
        return (
            <section className="organisation-list">
                <table>
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(organisations, name, sorted, reverse)}>
                                {I18n.t(`organisation.${name}`)}
                                {this.headerIcon(name, sorted, reverse)}
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


    renderSearch = (organisations, user, query, loadingAutoComplete, suggestions, moreToShow, selected) => {
        const adminClassName = user.admin ? "with-button" : "";
        const showAutoCompletes = (query.length > 1 || "*" === query.trim()) && !loadingAutoComplete;

        return (
            <section className="organisation-search">
                <div className="search">
                    <input type="text"
                           className={adminClassName}
                           onChange={this.search}
                           value={query}
                           onKeyDown={this.onSearchKeyDown}
                           placeholder={I18n.t("organisations.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {user.admin && <Button onClick={() => this}
                                           txt={I18n.t("organisations.add")}
                                           icon={<FontAwesomeIcon icon="plus"/>}/>
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
        const {organisations, query, loadingAutoComplete, suggestions, moreToShow, selected, sorted, reverse} = this.state;
        const {user} = this.props;
        return (
            <div className="organisations">
                {/*{this.renderSearch(organisations, user, query, loadingAutoComplete, suggestions, moreToShow, selected)}*/}
                <div className="title">
                    <span>{I18n.t("organisations.dashboard")}</span>
                </div>
                <section className="info-block-container">
                    {this.renderCollaborations(organisations)}
                    {this.renderMembers(organisations)}
                    {this.renderProfile(user)}
                </section>
                <div className="title">
                    <span>{I18n.t("organisations.title")}</span>
                </div>
                {this.renderOrganisations(organisations, user, sorted, reverse)}
            </div>);
    }
}

export default Organisations;