import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../Button";
import PropTypes from "prop-types";
import {isEmpty, sortObjects, valueForSort} from "../../utils/Utils";
import {headerIcon} from "../../forms/helpers";
import "./Entities.scss";
import SpinnerField from "./SpinnerField";
import Explain from "../Explain";

class Entities extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            query: "",
            sorted: props.defaultSort,
            reverse: false,
            showExplanation: false
        }
    }

    componentDidMount = () => {
        setTimeout(() => this.props.inputFocus && this.input && this.input.focus(), 150);
    }

    newEntity = () => {
        const {newEntityPath, newEntityFunc} = this.props;
        if (newEntityFunc) {
            newEntityFunc();
        } else {
            this.props.history.push(newEntityPath);
        }

    };

    closeExplanation = () => this.setState({showExplanation: false});

    queryChanged = e => {
        const query = e.target.value;
        this.setState({query: query});
        const {searchCallback, customSearch, entities, searchAttributes} = this.props;
        if (customSearch) {
            customSearch(query);
        }
        if (searchCallback) {
            searchCallback(this.filterEntities(entities, query, searchAttributes));
        }
    }

    renderSearch = (modelName, title, entities, query, searchAttributes, showNew, filters, explain, customSearch, hideTitle) => {
        return (
            <section className="entities-search">
                {showNew &&
                <Button onClick={this.newEntity} className={`plus ${hideTitle && !filters ? "no-title" : ""}`}
                        txt={I18n.t(`models.${modelName}.new`)}/>
                }
                {!hideTitle && <h1>{title || `${I18n.t(`models.${modelName}.title`)} (${entities.length})`}</h1>}
                {filters}


                <div className={`search ${showNew ? "" : "standalone"}`}>
                    {explain && <FontAwesomeIcon className="help" icon="question-circle"
                                                 id="impersonate_close_explanation"
                                                 onClick={() => this.setState({showExplanation: true})}/>}
                    {(!isEmpty(searchAttributes) || customSearch) && <div>

                        <input type="text"
                               onChange={this.queryChanged}
                               ref={ref => this.input = ref}
                               value={query}
                               placeholder={I18n.t(`models.${modelName}.searchPlaceHolder`)}/>
                        <FontAwesomeIcon icon="search"/>
                    </div>}

                </div>
            </section>
        );
    };

    filterEntities = (entities, query, searchAttributes, customSearch) => {
        if (isEmpty(query) || customSearch) {
            return entities;
        }
        query = query.toLowerCase();
        return entities.filter(entity => {
            return searchAttributes.some(attr => {
                const val = valueForSort(attr, entity);
                return val.toLowerCase().indexOf(query) > -1
            });
        });

    };

    setSorted = key => () => {
        const {sorted, reverse} = this.state;
        const reversed = (sorted === key ? !reverse : false);
        this.setState({sorted: key, reverse: reversed})
    }

    getEntityValue = (entity, column) => {
        if (column.mapper) {
            return column.mapper(entity);
        }
        return entity[column.key];
    }

    onRowClick = (rowLinkMapper, entity) => e => {
        const hasValue = typeof rowLinkMapper === "function" && rowLinkMapper(entity);
        if (hasValue) {
            hasValue(entity)(e);
        }
    }

    renderEntities = (entities, sorted, reverse, modelName, tableClassName, columns, children,
                      rowLinkMapper, customNoEntities) => {
        const hasEntities = !isEmpty(entities);
        return (
            <section className="entities-list">
                {hasEntities &&
                <table className={tableClassName || modelName}>
                    <thead>
                    <tr>
                        {columns.map(column =>
                            <th key={column.key} className={`${column.key} ${column.class || ""} ${column.nonSortable ? "" : "sortable"}`}
                                onClick={this.setSorted(column.key)}>
                                {column.header}
                                {headerIcon(column, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {entities.map((entity, index) =>
                        <tr key={index}
                            className={`${(typeof rowLinkMapper === "function" && rowLinkMapper(entity)) ? "clickable" : ""}`}>
                            {columns.map(column =>
                                <td key={column.key}
                                    onClick={(column.key !== "check" && column.key !== "role" && !column.hasLink) ?
                                        this.onRowClick(rowLinkMapper, entity) : undefined}
                                    className={`${column.key} ${column.nonSortable ? "" : "sortable"} ${column.className ? column.className : ""}`}>
                                    {this.getEntityValue(entity, column)}
                                </td>)}
                        </tr>
                    )}
                    </tbody>
                </table>}
                {(!hasEntities && !children) &&
                <p className="no-entities">{customNoEntities || I18n.t(`models.${modelName}.noEntities`)}</p>}
            </section>
        );
    };

    render() {
        const {
            modelName, entities, showNew, searchAttributes, columns, children, loading, customSearch,
            actions, title, filters, explain, rowLinkMapper, tableClassName, explainTitle, className = "",
            customNoEntities, hideTitle
        } = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const {query, sorted, reverse, showExplanation} = this.state;
        const filteredEntities = this.filterEntities(entities, query, searchAttributes, customSearch);
        const sortedEntities = sortObjects(filteredEntities, sorted, reverse);
        return (
            <div className={`mod-entities ${className}`}>
                {explain && <Explain
                    close={this.closeExplanation}
                    subject={explainTitle || I18n.t("explain.services")}
                    isVisible={showExplanation}>
                    {explain}
                </Explain>}
                {this.renderSearch(modelName, title, entities, query, searchAttributes, showNew, filters, explain, customSearch, hideTitle)}
                {actions}
                {this.renderEntities(sortedEntities, sorted, reverse, modelName, tableClassName, columns, children,
                    rowLinkMapper, customNoEntities)}
                <div>{this.props.children}</div>
            </div>);
    }
}

Entities.propTypes = {
    title: PropTypes.string,
    entities: PropTypes.array.isRequired,
    modelName: PropTypes.string.isRequired,
    tableClassName: PropTypes.string,
    className: PropTypes.string,
    customNoEntities: PropTypes.string,
    searchAttributes: PropTypes.array,
    defaultSort: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    columns: PropTypes.array.isRequired,
    newEntityPath: PropTypes.string,
    newEntityFunc: PropTypes.func,
    rowLinkMapper: PropTypes.func,
    searchCallback: PropTypes.func,
    customSearch: PropTypes.func,
    showNew: PropTypes.bool,
    actions: PropTypes.any,
    filters: PropTypes.any,
    explain: PropTypes.any,
    inputFocus: PropTypes.bool,
    hideTitle: PropTypes.bool
};

export default Entities;
