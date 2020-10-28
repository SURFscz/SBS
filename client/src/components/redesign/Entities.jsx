import React from "react";
import "./Organisations.scss";
import I18n from "i18n-js";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Button from "../Button";
import PropTypes from "prop-types";
import {isEmpty, sortObjects} from "../../utils/Utils";
import {headerIcon} from "../../forms/helpers";
import "./Entities.scss";

class Entities extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            query: "",
            sorted: props.defaultSort,
            reverse: false,
        }
    }

    newEntity = () => {
        this.props.history.push(this.props.newEntityPath);
    };

    renderSearch = (modelName, entities, query, searchAttributes, showNew) => {
        return (
            <section className="entities-search">

                <h1>{`${I18n.t(`models.${modelName}.title`)} (${entities.length})`}</h1>
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
        return entities.filter(entity =>
            searchAttributes.some(attr => entity[attr].toLowerCase().indexOf(query) > -1));
    };

    setSorted = key => () => {
        const {sorted, reverse} = this.state;
        const reversed = (sorted === key ? !reverse : false);
        this.setState({sorted: key, reverse: reversed})
    }

    sortTable = (entities, sorted, reversed) => {
        return sortObjects(entities, sorted, reversed);
    };

    getEntityValue = (entity, column) => {
        if (column.mapper) {
            return column.mapper(entity);
        }
        return entity[column.key];
    }

    renderEntities = (entities, sorted, reverse, modelName, columns) => {
        const hasEntities = !isEmpty(entities);
        return (
            <section className="entities-list">
                {hasEntities &&
                <table className={modelName}>
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
                        <tr key={index}>
                            {columns.map(column =>
                                <td key={column.key}
                                    className={`${column.key} ${column.nonSortable ? "" : "sortable"}`}>
                                    {this.getEntityValue(entity, column)}
                                </td>)}
                        </tr>
                    )}
                    </tbody>
                </table>}
                {!hasEntities && <p>{I18n.t(`models.${modelName}.noEntities`)}</p>}
            </section>
        );
    };

    render() {
        const {modelName, entities, showNew, searchAttributes, columns} = this.props;
        const {query, sorted, reverse} = this.state;

        const filteredEntities = this.filterEntities(entities, query, searchAttributes);
        const sortedEntities = this.sortTable(filteredEntities, sorted, reverse);
        return (
            <div className="mod-entities">
                {this.renderSearch(modelName, entities, query, searchAttributes, showNew)}
                {this.renderEntities(sortedEntities, sorted, reverse, modelName, columns)}
            </div>);
    }
}

Entities.propTypes = {
    entities: PropTypes.array.isRequired,
    modelName: PropTypes.string.isRequired,
    searchAttributes: PropTypes.array,
    defaultSort: PropTypes.string.isRequired,
    newEntityPath: PropTypes.string,
    showNew: PropTypes.bool,
    columns: PropTypes.array.isRequired
};

export default Entities;
