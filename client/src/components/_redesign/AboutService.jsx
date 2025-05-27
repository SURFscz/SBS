import React from "react";
import I18n from "../../locale/I18n";
import "./AboutService.scss";
import {stopEvent} from "../../utils/Utils";


class AboutService extends React.Component {

    toggleShowMore = e => {
        stopEvent(e);
        this.setState({showAll: !this.state.showAll})
    }

    render() {
        const {service} = this.props;
        const emails = [service.support_email, service.contact_email].filter(m => m);
        return (
            <div className="service-about-mod">
                <div className="support">
                    {emails.length > 0 && <h4>{I18n.t("service.support")}</h4>}
                    <ul>
                        {emails.map((email, index) => <li key={index}>
                                <span className="member">
                                    <a href={`mailto:${email}`}>{email}</a>
                                </span>
                        </li>)}
                    </ul>
                </div>
                <div className="admins">
                    {service.service_memberships.length > 0 && <h4>{I18n.t("service.admins")}</h4>}
                    <ul>
                        {service.service_memberships.map((m, index) => <li key={index}>
                                <span className="member">
                                    <a href={`mailto:${m.user.email}`}>{m.user.name}</a>
                                    <span className="role">{` (${I18n.t("models.collaboration.admin")})`}</span>
                                </span>
                        </li>)}
                    </ul>
                </div>
            </div>
        );
    }

}

export default AboutService;