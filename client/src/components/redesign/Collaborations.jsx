import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";

export default class Collaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true
        }
    }

    componentDidMount = () => {
        this.setState({loading: false});
    }

    noCollaborations() {
        return (<div className="collaborations">
            <TreeSwing/>
        </div>)
    }


    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    render() {
        const {loading} = this.state;
        const {collaborations, includeCounts = true, includeOrganisationName = false,
        modelName = "collaborations"} = this.props;

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations();
        }
        const {user} = this.props;
        //TODO permissions to create collaborations
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
            columns.push(            {
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
                      defaultSort="name" columns={columns} showNew={true}
                      newEntityPath={`/new-collaboration`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

