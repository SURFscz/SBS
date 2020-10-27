import React from "react";
import {allOrganisations, myOrganisations, searchOrganisations} from "../../api";
import "./Organisations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import debounce from "lodash.debounce";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../Button";
import Autocomplete from "../Autocomplete";
import {headerIcon} from "../../forms/helpers";
import BackLink from "../BackLink";


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

    componentDidMount = () => {
        const {user} = this.props;
        const promise = user.admin ? allOrganisations() : myOrganisations();
        promise
            .then(json => {
                json.forEach(org => {
                    const membership = (org.organisation_memberships || []).find(m => m.user_id === user.id);
                    org.role = membership ? membership.role : "";
                });
                const {sorted, reverse} = this.state;
                const organisations = this.sortOrganisations(json, sorted, reverse);
                this.setState({organisations: organisations, sortedOrganisations: organisations})
            });
    }

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
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
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
        const names = ["actions", "name", "role", "description"];
        const hasOrganisations = !isEmpty(organisations);
        return (
            <section className="organisation-list">
                {hasOrganisations && <table>
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
                </table>}
                {!hasOrganisations && <p>{I18n.t("organisations.noOrganisations")}</p>}
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
                    <span>{I18n.t("organisations.title", {nbr: organisations.length})}</span>
                    <input type="text"
                           className={adminClassName}
                           onChange={this.search}
                           value={query}
                           onKeyDown={this.onSearchKeyDown}
                           placeholder={I18n.t("organisations.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin && <Button onClick={this.newOrganisation}
                                        txt={I18n.t("organisation.new")}/>
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
                {this.renderOrganisations(sortedOrganisations, user, sorted, reverse)}
            </div>);
    }
}

export default Organisations;