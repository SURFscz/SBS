import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {myCollaborations} from "../../api";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";

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
            myCollaborations().then(res => {
                this.setState({standalone: true, collaborations: res, loading: false});
            })
        } else {
            this.setState({loading: false});
        }

    }

    noCollaborations = organisation => {
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <h2>{I18n.t("models.collaborations.noCollaborations")}</h2>
                <Button txt={I18n.t("models.collaborations.new")}
                        onClick={() => {
                            const organisationQueryParam = organisation ? `organisation=${organisation.id}` : "";
                            this.props.history.push(`/new-collaboration?${organisationQueryParam}`)
                        }}/>

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
        const {modelName = "collaborations", organisation} = this.props;

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations(this.props.organisation);
        }
        const {user} = this.props;
        const mayCreateCollaborations = isUserAllowed(ROLES.ORG_MANAGER, user);

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: collaboration => collaboration.logo &&
                    <img src={`data:image/jpeg;base64,${collaboration.logo}`} alt=""/>
            },
            {
                key: "name",
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <a href="/"
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>,
            },
            {
                key: "collaboration_memberships_count",
                header: I18n.t("models.collaborations.memberCount")
            },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }, {
                key: "organisation_name",
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? organisation.name : collaboration.organisation.name
            }]
        return (
            <Entities entities={collaborations}
                      modelName={modelName}
                      searchAttributes={["name"]}
                      defaultSort="name"
                      rowLinkMapper={() => this.openCollaboration}
                      columns={columns}
                      showNew={mayCreateCollaborations}
                      newEntityPath={`/new-collaboration`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

