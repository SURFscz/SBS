import React from "react";
import {myOrganisations} from "../api";
import "./Organisations.scss";


class Organisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: []
        }
    }

    componentWillMount = () => {
            myOrganisations()
                .then(json => this.setState({organisations: json}));
    };

    render() {
        const {organisations} = this.state;
        return <div className="organisations">
            { JSON.stringify(organisations, null, 2)}
        </div>
    }
}

export default Organisations;