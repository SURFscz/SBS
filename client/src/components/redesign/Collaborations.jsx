import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {myCollaborationsLite} from "../../api";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, rawGlobalUserRole, ROLES} from "../../utils/UserRole";

export default class Collaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            standalone: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaborations} = this.props;
        if (collaborations === undefined) {
            myCollaborationsLite().then(res => {
                this.setState({standalone: true, collaborations: res, loading: false});
            })
        } else {
            this.setState({loading: false});
        }

    }

    noCollaborations = () => {
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <h2>{I18n.t("models.collaborations.noCollaborations")}</h2>
                <Button txt={I18n.t("models.collaborations.new")}
                        onClick={() => this.props.history.push("/new-collaboration")}/>

            </div>
        )
    }

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    render() {
        const {loading, standalone} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {collaborations} = standalone ? this.state : this.props;
        const { includeCounts = true, includeOrganisationName = false, modelName = "collaborations" } = this.props;

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations();
        }
        const {user} = this.props;
        const mayCreateCollaborations = isUserAllowed(ROLES.ORG_MANAGER, user);

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: collaboration => collaboration.logo &&
                    <img src={`data:image/jpeg;base64,${collaboration.logo}`}/>
            },
            {
                key: "name",
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <a href="/"
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>,
            }]
        if (includeCounts) {
            columns.push({
                key: "member_count",
                header: I18n.t("models.collaborations.memberCount")
            });
            columns.push({
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            });
        }
        if (includeOrganisationName) {
            columns.push({
                key: "organisation_name",
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => collaboration.organisation.name
            })
        }
        return (
            <Entities entities={collaborations} modelName={modelName} searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={mayCreateCollaborations}
                      newEntityPath={`/new-collaboration`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

