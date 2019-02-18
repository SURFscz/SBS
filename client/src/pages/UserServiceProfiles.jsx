import React from "react";
import {myUserServiceProfiles,} from "../api";
import "./UserServiceProfiles.scss";
import {sortObjects, stopEvent} from "../utils/Utils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import I18n from "i18n-js";
import {headerIcon} from "../forms/helpers";

class UserServiceProfiles extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            userServiceProfiles: [],
            filteredUserServiceProfiles: [],
            sorted: "service__name",
            reverse: false,
            query: ""
        }
    }

    componentDidMount = () => {
        const {user} = this.props;
        myUserServiceProfiles(user.id)
            .then(json => {
                const {sorted, reverse} = this.state;
                const userServiceProfiles = sortObjects(json, sorted, reverse);
                this.setState({
                    userServiceProfiles: userServiceProfiles,
                    filteredUserServiceProfiles: [...userServiceProfiles]
                })
            });
    };

    openUserServiceProfileDetails = userServiceProfile => e => {
        stopEvent(e);
        this.props.history.push(`/user-service-profile-details/${userServiceProfile.id}`);
    };

    searchUserServiceProfiles = e => {
        const query = e.target.value.toLowerCase();
        const {userServiceProfiles, sorted, reverse} = this.state;
        const newUserServiceProfiles = userServiceProfiles.filter(profile =>
            profile.collaboration_membership.collaboration.name.toLowerCase().indexOf(query) > -1 ||
            (profile.name || "").toLowerCase().indexOf(query) > -1 ||
            (profile.email || "").toLowerCase().indexOf(query) > -1 ||
            (profile.service.name).toLowerCase().indexOf(query) > -1 ||
            (profile.address || "").toLowerCase().indexOf(query) > -1);
        const newSortedUserServiceProfiles = sortObjects(newUserServiceProfiles, sorted, reverse);
        this.setState({filteredUserServiceProfiles: newSortedUserServiceProfiles, query: query})
    };

    sortTable = (userServiceProfiles, name, sorted, reverse) => () => {
        if (name === "open") {
            return;
        }
        const reversed = (sorted === name ? !reverse : false);
        const sortedUserServiceProfiles = sortObjects(userServiceProfiles, name, reversed);
        this.setState({filteredUserServiceProfiles: sortedUserServiceProfiles, sorted: name, reverse: reversed});
    };

    renderUserServiceProfileTable = (userServiceProfiles, sorted, reverse) => {
        const names = ["open", "service__name", "authorisation_group__name", "authorisation_group__collaboration__name", "email", "role", "status"];
        return (
            <div className="user-service-profiles-list">
                <table>
                    <thead>
                    <tr>
                        {names.map(name =>
                            <th key={name} className={name}
                                onClick={this.sortTable(userServiceProfiles, name, sorted, reverse)}>
                                {I18n.t(`userServiceProfile.${name}`)}
                                {name !== "open" && headerIcon(name, sorted, reverse)}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {userServiceProfiles.map((profile, i) => <tr key={i}
                                                                 onClick={this.openUserServiceProfileDetails(profile)}>
                        <td className="open"><FontAwesomeIcon icon="arrow-right"/></td>
                        <td className="service_name">{profile.service.name}</td>
                        <td className="authorisation_group_name">{profile.authorisation_group.name}</td>
                        <td className="collaboration_name">{profile.authorisation_group.collaboration.name}</td>
                        <td className="email">{profile.email}</td>
                        <td className="role">{profile.role}</td>
                        <td className="status">{profile.status ? I18n.t(`userServiceProfile.statusValues.${profile.status}`) : ""}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        );
    };

    renderUserServiceProfiles = (userServiceProfiles, sorted, reverse, query) => {
        return (
            <section className="user-service-profiles-search">
                <div className="search">
                    <input type="text"
                           onChange={this.searchUserServiceProfiles}
                           value={query}
                           placeholder={I18n.t("userServiceProfile.searchPlaceHolder")}/>
                    <FontAwesomeIcon icon="search"/>
                </div>
                {this.renderUserServiceProfileTable(userServiceProfiles, sorted, reverse)}
            </section>

        );
    };

    render() {
        const {
            filteredUserServiceProfiles, sorted, reverse, query
        } = this.state;
        return (<div className="mod-user-service-profiles">
            <div className="title">
                <a href="/home" onClick={e => {
                    stopEvent(e);
                    this.props.history.push("/home");
                }}><FontAwesomeIcon icon="arrow-left"/>
                    {I18n.t("home.backToHome")}
                </a>
                <p className="title">{I18n.t("userServiceProfile.title")}</p>
            </div>
            <div className="user-service-profiles">
                {this.renderUserServiceProfiles(filteredUserServiceProfiles, sorted, reverse, query)}
            </div>
        </div>)
    }
}

export default UserServiceProfiles;