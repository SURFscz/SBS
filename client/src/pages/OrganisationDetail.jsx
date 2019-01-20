import React from "react";
import {organisationById} from "../api";
import "./OrganisationDetail.scss";
import ReactJson from 'react-json-view'

class OrganisationDetail extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisation: {}
        }
    }

    componentWillMount = () => {
        const params = this.props.match.params;
        if (params.id) {
            organisationById(params.id)
                .then(json => this.setState({organisation: json}))
                .catch(e => this.props.history.push("/404"));
        } else {
            this.props.history.push("/404");
        }
    };

    render() {
        const {organisation} = this.state;
        return <div className="mod-organisation-detail">
            <ReactJson src={organisation} root="organisation" displayObjectSize={false} displayDataTypes={false}
                       enableClipboard={false}/>
        </div>
    }
}

export default OrganisationDetail;