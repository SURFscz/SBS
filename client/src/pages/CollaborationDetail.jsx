import React from "react";
import {collaborationById} from "../api";
import "./CollaborationDetail.scss";
import ReactJson from 'react-json-view'

class CollaborationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            collaboration: {}
        }
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            collaborationById(params.id)
                .then(json => this.setState({collaboration: json}));
        } else {
            this.props.history.push("/404");
        }
    };

    render() {
        const {collaboration} = this.state;
        return <div className="mod-collaboration-detail">
            <ReactJson src={collaboration} root="collaboration" displayObjectSize={false} displayDataTypes={false}
                       enableClipboard={false}/>
        </div>
    }
}

export default CollaborationDetail;