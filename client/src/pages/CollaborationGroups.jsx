import React from "react";
import {collaborationGroups, deleteGroup,} from "../api";
import "./CollaborationGroups.scss";
import {sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import Button from "../components/Button";
import {headerIcon} from "../forms/helpers";
import {setFlash} from "../utils/Flash";
import ConfirmationDialog from "../components/ConfirmationDialog";
import BackLink from "../components/BackLink";


class CollaborationGroups extends React.Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            collaboration: null,
            groups: [],
            filteredGroups: [],
            sorted: "name",
            reverse: false,
            query: "",
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({confirmationDialogOpen: false}),
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationQuestion: I18n.t("groups.deleteConfirmation"),
        }
    }

    componentDidMount = () => {
        const params = this.props.match.params;
        if (params.collaboration_id) {
            collaborationGroups(params.collaboration_id)
                .then(json => {
                    const {sorted, reverse} = this.state;
                    const groups = sortObjects(json.groups, sorted, reverse);
                    this.setState({
                        collaboration: json,
                        groups: groups,
                        filteredGroups: [...groups]
                    })
                });
        } else {
            this.props.history.push("/404");
        }
    };

    openGroupDetails = group => e => {
        stopEvent(e);
        const {collaboration} = this.state;
        this.props.history.push(`/collaboration-group-details/${collaboration.id}/${group.id}`);
    };

    delete = group => e => {
        stopEvent(e);
        this.setState({
            confirmationDialogOpen: true,
            confirmationQuestion: I18n.t("groups.deleteConfirmation", {name: group.name}),
            confirmationDialogAction: this.doDelete(group)
        });
    };

    doDelete = group => () => {
        this.setState({confirmationDialogOpen: false});
        deleteGroup(group.id)
            .then(() => {
                this.componentDidMount();
                setFlash(I18n.t("groups.flash.deleted", {name: group.name}));
            });
    };


    searchGroups = e => {
        const query = e.target.value.toLowerCase();
        const {groups, sorted, reverse} = this.state;
        const newGroups = groups.filter(group =>
            group.name.toLowerCase().indexOf(query) > -1 ||
            (group.description || "").toLowerCase().indexOf(query) > -1 ||
            (group.urn || "").toLowerCase().indexOf(query) > -1);
        const newSortedGroups = sortObjects(newGroups, sorted, reverse);
        this.setState({filteredGroups: newSortedGroups, query: query})
    };

    sortTable = (groups, name, sorted, reverse) => () => {
        if (name === "actions" || name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedGroups = sortObjects(groups, name, reversed);
        this.setState({filteredGroups: sortedGroups, sorted: name, reverse: reversed});
    };

    renderGroupTable = (groups, sorted, reverse) => {
        const names = ["open", "name", "short_name", "global_urn", "description", "actions"];
        return (
            <div className="groups-list">
                <table className="groups">
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(groups, name, sorted, reverse)}>
                                {I18n.t(`groups.${name}`)}
                                {name !== "actions" && headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {groups.map((group, i) => <tr key={i} onClick={this.openGroupDetails(group)}>
                        <td className="open" >
                            <FontAwesomeIcon icon="arrow-right"/>
                        </td>
                        <td className="name">{group.name}</td>
                        <td className="short_name">{group.short_name}</td>
                        <td className="global_urn">{group.global_urn}</td>
                        <td className="description">{group.description}</td>
                        <td className="actions"><FontAwesomeIcon icon="trash"
                                                                 onClick={this.delete(group)}/></td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    renderGroups = (groups, sorted, reverse, query) => {
        return (
            <section className="groups-search">
                <div className="search">
                    <input type="text"
                           className="with-button"
                           onChange={this.searchGroups}
                           value={query}
                           placeholder={I18n.t("groups.searchPlaceHolder")}/>
                    <FontAwesomeIcon icon="search" className="with-button"/>
                    <Button onClick={this.openGroupDetails({id: "new"})}
                            txt={I18n.t("groups.new")}/>
                </div>
                {this.renderGroupTable(groups, sorted, reverse)}
            </section>

        );
    };

    render() {
        const {
            collaboration, filteredGroups, sorted, reverse, query,
            confirmationDialogOpen, cancelDialogAction, confirmationDialogAction, confirmationQuestion
        } = this.state;
        if (!collaboration) {
            return null;
        }
        return (<div className="mod-collaboration-groups">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>

                <BackLink history={this.props.history}/>
                <p className="title">{I18n.t("groups.title", {name: collaboration.name})}</p>
                <div className="collaboration-groups">
                    {this.renderGroups(filteredGroups, sorted, reverse, query)}
                </div>
            </div>
        )
    }
}

export default CollaborationGroups;