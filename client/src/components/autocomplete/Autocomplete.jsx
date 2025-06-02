import React from "react";
import I18n from "../../locale/I18n";
import scrollIntoView from "scroll-into-view";
import {isEmpty} from "../../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import "./Autocomplete.scss";

export default class Autocomplete extends React.PureComponent {

    componentDidUpdate(prevProps) {
        if (this.selectedRow && prevProps.selected !== this.props.selectedRow) {
            scrollIntoView(this.selectedRow);
        }
    }

    item = (value, query) => {
        if (isEmpty(value)) {
            return <span></span>;
        }
        if (Array.isArray(value)) {
            return value.map((val, i) => <span key={i} className="compound">
                {Object.keys(val).map(key => <span className="inner-compound" key={key}>{`${val[key]}`}</span>)}
            </span>)
        }
        value = value.toString();
        const nameToLower = value.toLowerCase();
        const indexOf = nameToLower.indexOf(query.toLowerCase());
        if (indexOf < 0) {
            return <span>{value}</span>;
        }
        const first = value.substring(0, indexOf);
        const middle = value.substring(indexOf, indexOf + query.length);
        const last = value.substring(indexOf + query.length);
        return <span>{first}<span className="matched">{middle}</span>{last}</span>;
    };

    render() {
        const {
            suggestions, query, selected, itemSelected, moreToShow, entityName, additionalAttributes = [],
            ignoreAttributes = [], includeHeaders = false
        } = this.props;
        const showNoResults = query && (query.trim().length > 2 || "*" === query.trim()) && suggestions.length === 0;
        const showSuggestions = suggestions && suggestions.length > 0;
        return (
            <section className="autocomplete">
                {showNoResults &&
                <div className="no-results">{I18n.t("autocomplete.noResults")}</div>
                }
                {showSuggestions &&
                <div>
                    {moreToShow &&
                    <em className="results-limited">{I18n.t("autocomplete.resultsLimited")}</em>}
                    <table className="result">
                        <thead>
                        {includeHeaders && <tr>
                            {!ignoreAttributes.includes("name") && <th>{I18n.t("autocomplete.name")}</th>}
                            {!ignoreAttributes.includes("description") && <th>{I18n.t("autocomplete.description")}</th>}
                            {additionalAttributes.map((attr, i) => <th key={i}>
                                {I18n.t(`autocomplete.${attr}`)}
                            </th>)}
                        </tr>}
                        </thead>
                        <tbody>
                        {suggestions
                            .map((item, index) => (
                                    <tr key={index}
                                        className={selected === index ? "active" : ""}
                                        onClick={() => itemSelected(item)}
                                        ref={ref => {
                                            if (selected === index) {
                                                this.selectedRow = ref;
                                            }
                                        }}>
                                        {!isEmpty(entityName) && <td className="link">
                                            <a href={`/${entityName}/${item.id}`}
                                               rel="noopener noreferrer"
                                               onClick={e => e.stopPropagation()}
                                               target="_blank">
                                                <FontAwesomeIcon icon="external-link-alt"/>
                                            </a></td>}
                                        {!ignoreAttributes.includes("name") && <td>{this.item(item.name, query)}</td>}
                                        {!ignoreAttributes.includes("description") &&
                                        <td>{this.item(item.description, query)}</td>}
                                        {additionalAttributes.map((attr, i) => <td key={i}>
                                            {this.item(item[attr], query)}
                                        </td>)}
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>}
            </section>
        );
    }

}
