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
        const {organisation} = this.props;

        if (isEmpty(organisation.collaborations) && !loading) {
            return this.noCollaborations();
        }

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
            },
            {
                key: "member_count",
                header: I18n.t("models.collaborations.memberCount")
            },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }]
        return (
            <Entities entities={organisation.collaborations} modelName="collaborations" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={true}
                      newEntityPath={`/new-collaboration?organisation=${organisation.id}`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

