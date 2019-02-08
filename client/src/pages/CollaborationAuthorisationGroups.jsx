import React from "react";
import {collaborationAuthorisationGroups, deleteAuthorisationGroup,} from "../api";
import "./CollaborationAuthorisationGroups.scss";
import {sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import Button from "../components/Button";
import Select from "react-select";
import {headerIcon} from "../forms/helpers";
import {authorisationGroupStatuses} from "../forms/constants";
import {setFlash} from "../utils/Flash";
import ConfirmationDialog from "../components/ConfirmationDialog";


class CollaborationAuthorisationGroups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.statusOptions = authorisationGroupStatuses.map(type => ({
            value: type,
            label: I18n.t(`authorisationGroup.statusValues.${type}`)
        }));

        this.state = {
            collaboration: null,
            authorisationGroups: [],
            filteredAuthorisationGroups: [],
            sorted: "name",
            reverse: false,
            query: "",
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: I18n.t("authorisationGroup.deleteConfirmation"),
        }
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            collaborationAuthorisationGroups(params.collaboration_id)
                .then(json => {
                    const {sorted, reverse} = this.state;
                    const authorisationGroups = sortObjects(json.authorisation_groups, sorted, reverse);
                    this.setState({
                        collaboration: json,
                        authorisationGroups: authorisationGroups,
                        filteredAuthorisationGroups: [...authorisationGroups]
                    })
                });
        } else {
            this.props.history.push("/404");
        }
    };

    openAuthorisationGroupDetails = authorisationGroup => e => {
        stopEvent(e);
        const {collaboration} = this.state;
        this.props.history.push(`/collaboration-authorisation-group-details/${collaboration.id}/${authorisationGroup.id}`);
    };

    delete = group => e => {
        stopEvent(e);
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("authorisationGroup.deleteConfirmation", {name: group.name}),
            confirmationDialogAction: this.doDelete(group)
        });
    };

    doDelete = group => () => {
        this.setState({confirmationDialogOpen: false});
        deleteAuthorisationGroup(group.id)
            .then(() => {
                this.componentDidMount();
                setFlash(I18n.t("authorisationGroup.flash.deleted", {name: group.name}));
            });
    };


    searchAuthorisationGroups = e => {
        const query = e.target.value.toLowerCase();
        const {authorisationGroups, sorted, reverse} = this.state;
        const newAuthorisationGroups = authorisationGroups.filter(group =>
            group.name.toLowerCase().indexOf(query) > -1 ||
            (group.description || "").toLowerCase().indexOf(query) > -1 ||
            (group.urn || "").toLowerCase().indexOf(query) > -1);
        const newSortedAuthorisationGroups = sortObjects(newAuthorisationGroups, sorted, reverse);
        this.setState({filteredAuthorisationGroups: newSortedAuthorisationGroups, query: query})
    };

    sortTable = (authorisationGroups, name, sorted, reverse) => () => {
        if (name === "actions" || name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedAuthorisationGroups = sortObjects(authorisationGroups, name, reversed);
        this.setState({filteredAuthorisationGroups: sortedAuthorisationGroups, sorted: name, reverse: reversed});
    };

    renderAuthorisationGroupTable = (authorisationGroups, sorted, reverse) => {
        const names = ["open", "name", "uri", "description", "status", "actions"];
        return (
            <div className="authorisation-groups-list">
                <table className="authorisation-groups">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(authorisationGroups, name, sorted, reverse)}>
                                {I18n.t(`authorisationGroup.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {authorisationGroups.map((group, i) => <tr key={i}
                                                               onClick={this.openAuthorisationGroupDetails(group)}>
                        <td className="open"><FontAwesomeIcon icon="arrow-right"/></td>
                        <td className="name">{group.name}</td>
                        <td className="uri">{group.uri}</td>
                        <td className="description">{group.description}</td>
                        <td className="status">
                            <Select
                                classNamePrefix="select-disabled"
                                value={this.statusOptions.find(option => group.status === option.value)}
                                options={this.statusOptions.filter(option => group.status === option.value)}
                                isDisabled={true}
                            /></td>
                        <td className="actions"><FontAwesomeIcon icon="trash"
                                                                 onClick={this.delete(group)}/></td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    renderAuthorisationGroups = (authorisationGroups, sorted, reverse, query) => {
        return (
            <section className="authorisation-groups-search">
                <div className="search">
                    <input type="text"
                           className="with-button"
                           onChange={this.searchAuthorisationGroups}
                           value={query}
                           placeholder={I18n.t("authorisationGroup.searchPlaceHolder")}/>
                    <FontAwesomeIcon icon="search" className="with-button"/>
                    <Button onClick={this.openAuthorisationGroupDetails({id: "new"})}
                            txt={I18n.t("authorisationGroup.new")}/>
                </div>
                {this.renderAuthorisationGroupTable(authorisationGroups, sorted, reverse)}
            </section>

        );
    };

    render() {
        const {
            collaboration, filteredAuthorisationGroups, sorted, reverse, query,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion
        } = this.state;
        if (!collaboration) {
            return null;
        }
        return (<div className="mod-collaboration-authorisation-groups">
            <ConfirmationDialog isOpen={confirmationDialogOpen}
                                cancel={cancelDialogAction}
                                confirm={confirmationDialogAction}
                                question={confirmationQuestion}/>

            <div className="title">
                <a href={`/collaborations/${collaboration.id}`} onClick={e => {
                    stopEvent(e);
                    this.props.history.push(`/collaborations/${collaboration.id}`);
                }}><FontAwesomeIcon icon="arrow-left"/>
                    {I18n.t("collaborationDetail.backToCollaborationDetail", {name: collaboration.name})}
                </a>
                <p className="title">{I18n.t("authorisationGroup.title", {name: collaboration.name})}</p>
            </div>
            <div className="collaboration-authorisation-groups">
                {this.renderAuthorisationGroups(filteredAuthorisationGroups, sorted, reverse, query)}
            </div>
        </div>)
    }
}

export default CollaborationAuthorisationGroups;