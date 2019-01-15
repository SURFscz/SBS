import React from "react";
import {organisationById} from "../api";
import "./OrganisationDetail.scss";


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
            { JSON.stringify(organisation, null, 2)}
        </div>
    }
}

export default OrganisationDetail;