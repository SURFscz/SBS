import React from "react";
import {health, searchServices} from "../api";
import "./Services.scss";
import {isEmpty, stopEvent} from "../utils/Utils";
import debounce from "lodash.debounce";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../components/Button";
import Autocomplete from "../components/Autocomplete";


class Services extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selected: -1,
            suggestions: [],
            query: "",
            loadingAutoComplete: false,
            moreToShow: false,
        }
    }

    componentDidMount = () => {
        health().then(json => true);
        if (this.inputSearch) {
            this.inputSearch.focus();
        }
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
        searchServices(this.state.query).then(results => this.setState({
            suggestions: results.length > 15 ? results.slice(0, results.length - 1) : results,
            loadingAutoComplete: false,
            moreToShow: results.length > 15 && this.state.query !== "*"
        })), 200);

    itemSelected = service => {
        this.props.history.push(`/services/${service.id}`);
    };

    newService = () => this.props.history.push("services/new");

    onBlurSearch = suggestions => () => {
        if (!isEmpty(suggestions)) {
            setTimeout(() => this.setState({suggestions: [], loadingAutoComplete: true}), 250);
        } else {
            this.setState({suggestions: [], loadingAutoComplete: true});
        }
    };


    renderSearch = (services, user, query, loadingAutoComplete, suggestions, moreToShow, selected) => {
        const adminClassName = user.admin ? "with-button" : "";
        const showAutoCompletes = (query.length > 1 || "*" === query.trim()) && !loadingAutoComplete;
        const isAdmin = user.admin;

        return (
            <section className="service-search">
                <div className="search"
                     tabIndex="1" onBlur={this.onBlurSearch(suggestions)}>
                    <input type="text"
                           ref={ref => this.inputSearch = ref}
                           className={adminClassName}
                           onChange={this.search}
                           value={query}
                           onKeyDown={this.onSearchKeyDown}
                           placeholder={I18n.t("services.searchPlaceHolder")}/>
                    {<FontAwesomeIcon icon="search" className={adminClassName}/>}
                    {isAdmin && <Button onClick={this.newService}
                                        txt={I18n.t("services.add")}/>
                    }
                </div>
                {showAutoCompletes && <Autocomplete suggestions={suggestions}
                                                    query={query}
                                                    selected={selected}
                                                    itemSelected={this.itemSelected}
                                                    moreToShow={moreToShow}
                                                    entityName="services"
                                                    additionalAttributes={["entity_id"]}/>}
            </section>

        );
    };

    render() {
        const {services, query, loadingAutoComplete, suggestions, moreToShow, selected} = this.state;
        const {user} = this.props;
        return (
            <div className="mod-services">
                {this.renderSearch(services, user, query, loadingAutoComplete, suggestions, moreToShow, selected)}
            </div>);
    }
}

export default Services;