import React from "react";
import "./Organisations.scss";
import I18n from "../../locale/I18n";
import {ReactComponent as SearchIcon} from "@surfnet/sds/icons/functional-icons/search.svg";
import Button from "../Button";
import PropTypes from "prop-types";
import {isEmpty, sortObjects, valueForSort} from "../../utils/Utils";
import {headerIcon} from "../../forms/helpers";
import "./Entities.scss";
import SpinnerField from "./SpinnerField";
import Explain from "../Explain";
import {Pagination} from "@surfnet/sds";
import {pageCount} from "../../utils/Pagination";

class Entities extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            query: "",
            sorted: props.defaultSort,
            reverse: false,
            showExplanation: false,
            page: 1
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

    renderSearch = (modelName, title, entities, query, searchAttributes, showNew, newLabel, filters, explain, customSearch, hideTitle) => {
        const filterClassName = !hideTitle && filters ? "filters-with-title" : `${modelName}-search-filters`;
        return (
            <section className="entities-search">
                {showNew &&
                <Button onClick={this.newEntity}
                        className={`${hideTitle && !filters ? "no-title" : ""}`}
                        txt={newLabel || I18n.t(`models.${modelName}.new`)}/>
                }
                {!hideTitle && <h2>{title || `${I18n.t(`models.${modelName}.title`)} (${entities.length})`}</h2>}
                <div className={filterClassName}>{filters}</div>
                <div className={`search ${showNew ? "" : "standalone"}`}>
                    {(!isEmpty(searchAttributes) || customSearch) &&
                    <div className={"sds--text-field sds--text-field--has-icon"}>
                        <div className="sds--text-field--shape">
                            <div className="sds--text-field--input-and-icon">
                                <input className={"sds--text-field--input"}
                                       type="search"
                                       onChange={this.queryChanged}
                                       ref={ref => this.input = ref}
                                       value={query}
                                       placeholder={I18n.t(`models.${modelName}.searchPlaceHolder`)}/>
                                <span className="sds--text-field--icon">
                                    <SearchIcon/>
                                </span>
                            </div>
                        </div>
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
                      rowLinkMapper, customNoEntities, onHover, actions, showActionsAlways, actionHeader, page, pagination) => {
        const hasEntities = !isEmpty(entities);
        const total = entities.length;
        if (pagination) {
            const minimalPage = Math.min(page, Math.ceil(entities.length / pageCount));
            entities = entities.slice((minimalPage - 1) * pageCount, minimalPage * pageCount);
        }
        return (
            <section className="entities-list">
                {(actions && (showActionsAlways || hasEntities)) && <div className={`actions-header ${actionHeader}`}>
                    {actions}
                </div>}
                {hasEntities &&
                <div className={"sds--table"}>
                    <table className={tableClassName || modelName}>
                        <thead>
                        <tr>
                            {columns.map((column, i) => {
                                const showHeader = !actions || i < 2 || column.showHeader;
                                return <th key={`th_${column.key}_${i}`}
                                           className={`${column.key} ${column.class || ""} ${column.nonSortable ? "" : "sortable"} ${showHeader ? "" : "hide"}`}
                                           onClick={this.setSorted(column.key)}>
                                    {column.header}
                                    {headerIcon(column, sorted, reverse)}
                                </th>
                            })}
                        </tr>
                        </thead>
                        <tbody>
                        {entities.map((entity, index) =>
                            <tr key={`tr_${entity.id}_${index}`}
                                className={`${(typeof rowLinkMapper === "function" && rowLinkMapper(entity)) ? "clickable" : ""} ${onHover ? "hoverable" : ""}`}>
                                {columns.map((column, i) =>
                                    <td key={`td_${column.key}_${i}`}
                                        onClick={(column.key !== "check" && column.key !== "role" && !column.hasLink) ?
                                            this.onRowClick(rowLinkMapper, entity) : undefined}
                                        className={`${column.key} ${column.nonSortable ? "" : "sortable"} ${column.className ? column.className : ""}`}>
                                        {this.getEntityValue(entity, column)}
                                    </td>)}
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>}
                {(!hasEntities && !children) &&
                <p className="no-entities">{customNoEntities || I18n.t(`models.${modelName}.noEntities`)}</p>}
                {pagination && <Pagination currentPage={page}
                                           onChange={nbr => this.setState({page: nbr})}
                                           total={total}
                                           pageCount={pageCount}/>}
            </section>
        );
    };

    render() {
        const {
            modelName,
            entities,
            showNew,
            newLabel,
            searchAttributes,
            columns,
            children,
            loading,
            customSearch,
            actions,
            title,
            filters,
            explain,
            rowLinkMapper,
            tableClassName,
            explainTitle,
            className = "",
            customNoEntities,
            hideTitle,
            onHover,
            actionHeader = "",
            pagination = true,
            showActionsAlways,
            displaySearch = true
        } = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const {query, sorted, reverse, page, showExplanation} = this.state;
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
                {displaySearch && this.renderSearch(modelName, title, entities, query, searchAttributes, showNew, newLabel, filters, explain, customSearch, hideTitle)}
                {this.renderEntities(sortedEntities, sorted, reverse, modelName, tableClassName, columns, children,
                    rowLinkMapper, customNoEntities, onHover, actions, showActionsAlways, actionHeader, page, pagination)}
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
    onHover: PropTypes.bool,
    displaySearch: PropTypes.bool,
    rowLinkMapper: PropTypes.func,
    searchCallback: PropTypes.func,
    customSearch: PropTypes.func,
    showNew: PropTypes.bool,
    actions: PropTypes.any,
    showActionsAlways: PropTypes.bool,
    filters: PropTypes.any,
    explain: PropTypes.any,
    inputFocus: PropTypes.bool,
    hideTitle: PropTypes.bool
};

export default Entities;
