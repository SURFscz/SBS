import React from "react";
import {withRouter} from "react-router-dom";
import I18n from "i18n-js";
import "./Aup.scss";
import Button from "../components/Button";
import {agreeAup, aupLinks} from "../api";
import CheckBox from "../components/CheckBox";
import {getParameterByName} from "../utils/QueryParameters";
import {stopEvent} from "../utils/Utils";


class Aup extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {aup: {}, agreed: false};
    }

    componentDidMount() {
        aupLinks().then(res => this.setState({"aup": res}));
    }

    agreeWith = e => agreeAup().then(() => {
        stopEvent(e);
        this.props.refreshUser(() => {
            const location = getParameterByName("state", window.location.search) || "/home";
            this.props.history.push(location)
        });
    });

    render() {
        const {aup, agreed} = this.state;
        const {currentUser} = this.props;
        return (
            <div className="mod-aup">

                <div className="intro">
                    {<p dangerouslySetInnerHTML={{__html: I18n.t("aup.title1")}}/>}
                    {<p dangerouslySetInnerHTML={{__html: I18n.t("aup.title2")}}/>}
                    {!currentUser.guest && <p dangerouslySetInnerHTML={{__html: I18n.t("aup.title3")}}/>}
                </div>

                <div className="htmlAup" dangerouslySetInnerHTML={{__html: aup.html}}/>

                <div className="download">
                    {!currentUser.guest && <CheckBox name="aup" value={agreed} info={I18n.t("aup.agreeWithTerms")}
                                                     onChange={e => this.setState({agreed: !agreed})}/>}
                    <a href={aup.pdf_link} className="pdf" download={aup.pdf} target="_blank" rel="noopener noreferrer">
                        {I18n.t("aup.downloadPdf")}
                    </a>
                </div>


                {!currentUser.guest && <Button className="proceed" onClick={this.agreeWith}
                                               txt={I18n.t("aup.continueToValidation")} disabled={!agreed}/>}
            </div>
        )
    }
}

export default withRouter(Aup);