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

    newEntity = () => {
        const {newEntityPath, newEntityFunc} = this.props;
        if (newEntityFunc) {
            newEntityFunc();
        } else {
            this.props.history.push(newEntityPath);
        }

    };

    closeExplanation = () => this.setState({showExplanation: false});

    renderSearch = (modelName, title, entities, query, searchAttributes, showNew, filters, explain) => {
        return (
            <section className="entities-search">

                <h1>{title || `${I18n.t(`models.${modelName}.title`)} (${entities.length})`}</h1>
                {explain && <FontAwesomeIcon className="help" icon="question-circle"
                                             id="impersonate_close_explanation"
                                             onClick={() => this.setState({showExplanation: true})}/>}
                {filters}
                {!isEmpty(searchAttributes) &&
                <div className="search">
                    <input type="text"
                           onChange={e => this.setState({query: e.target.value})}
                           value={query}
                           placeholder={I18n.t(`models.${modelName}.searchPlaceHolder`)}/>
                    <FontAwesomeIcon icon="search"/>
                </div>}
                {showNew && <Button onClick={this.newEntity}
                                    txt={I18n.t(`models.${modelName}.new`)}/>
                }
            </section>
        );
    };

    filterEntities = (entities, query, searchAttributes) => {
        if (isEmpty(query)) {
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

    renderEntities = (entities, sorted, reverse, modelName, tableClassName, columns, children, rowLinkMapper) => {
        const hasEntities = !isEmpty(entities);
        return (
            <section className="entities-list">
                {hasEntities &&
                <table className={tableClassName || modelName}>
                    <thead>
                    <tr>
                        {columns.map(column =>
                            <th key={column.key} className={`${column.key} ${column.nonSortable ? "" : "sortable"}`}
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
                                    onClick={column.key !== "check" ? this.onRowClick(rowLinkMapper, entity) : undefined}
                                    className={`${column.key} ${column.nonSortable ? "" : "sortable"}`}>
                                    {this.getEntityValue(entity, column)}
                                </td>)}
                        </tr>
                    )}
                    </tbody>
                </table>}
                {(!hasEntities && !children) &&
                <p className="no-entities">{I18n.t(`models.${modelName}.noEntities`)}</p>}
            </section>
        );
    };

    render() {
        const {
            modelName, entities, showNew, searchAttributes, columns, children, loading,
            actions, title, filters, explain, rowLinkMapper, tableClassName, explainTitle
        } = this.props;
        if (loading) {
            return <SpinnerField/>;
        }
        const {query, sorted, reverse, showExplanation} = this.state;
        const filteredEntities = this.filterEntities(entities, query, searchAttributes);
        const sortedEntities = sortObjects(filteredEntities, sorted, reverse);
        return (
            <div className="mod-entities">
                {explain && <Explain
                    close={this.closeExplanation}
                    subject={explainTitle || I18n.t("explain.services")}
                    isVisible={showExplanation}>
                    {explain}
                </Explain>}
                {this.renderSearch(modelName, title, entities, query, searchAttributes, showNew, filters, explain)}
                {actions}
                {this.renderEntities(sortedEntities, sorted, reverse, modelName, tableClassName, columns, children, rowLinkMapper)}
                <div>{this.props.children}</div>
            </div>);
    }
}

Entities.propTypes = {
    title: PropTypes.string,
    entities: PropTypes.array.isRequired,
    modelName: PropTypes.string.isRequired,
    tableClassName: PropTypes.string,
    searchAttributes: PropTypes.array,
    defaultSort: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    columns: PropTypes.array.isRequired,
    newEntityPath: PropTypes.string,
    newEntityFunc: PropTypes.func,
    rowLinkMapper: PropTypes.func,
    showNew: PropTypes.bool,
    actions: PropTypes.any,
    filters: PropTypes.any,
    explain: PropTypes.any
};

export default Entities;
