import React from "react";

import "./CollaborationRequests.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";

export default class CollaborationRequests extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {}
    }

    openCollaborationRequest = collaborationRequest => e => {
        stopEvent(e);
        this.props.history.push(`/collaboration-requests/${collaborationRequest.id}`);
    };

    render() {
        const {organisation} = this.props;

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: cr => cr.logo &&
                    <img src={`data:image/jpeg;base64,${cr.logo}`} alt=""/>
            },
            {
                key: "name",
                header: I18n.t("models.collaborations.name"),
                mapper: cr => <a href="/"
                                 onClick={this.openCollaborationRequest(cr)}>{cr.name}</a>,
            },
            {
                key: "requester",
                header: I18n.t("models.collaboration_requests.requester"),
                mapper: cr => <div className="user-name-email-container">
                    <div className="user-name-email">
                        <span className="name">{cr.requester.name}</span>
                        <span className="email">{cr.requester.email}</span>
                    </div>
                </div>
            }
        ]
        return (
            <Entities entities={organisation.collaboration_requests}
                      modelName={"collaboration_requests"}
                      searchAttributes={["name", "requester__name"]}
                      defaultSort="name"
                      rowLinkMapper={() => this.openCollaborationRequest}
                      columns={columns}
                      showNew={false}
                      loading={false}
                      {...this.props}/>
        )
    }

}

