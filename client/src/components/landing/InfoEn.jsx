import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./info.scss";

export default function InfoNl() {

    const managerFeatures = ["Create your team (CO/VO)", "Connect services", "Invite/ Onboard team members", "Manage who can access what"];
    const memberFeatures = ["Get invited", "Use your institution id, or a guest account to get access to research resources", "Manage your profile, SSH keys etc once", "Less time spent waiting, more time for research collaboration"];
    const spFeatures = ["Connect your service (LDAP, SAML, OIDC)", "Configure (de)provisioning", "Improve security", "Enjoy less time doing support"];
    const institutionFeatures = ["Improve support for researchers", "Improve security (AVG/GDPR): no zero hour contract accounts etc", "Improve visibility of which researchers work where/on what", "Configure which employees can create teams"];

    const renderFeatures = (features, title) =>
        <div className="card">
            <div className="title">{title}</div>
            <div className="features">
                {features.map((f, i) =>
                    <table key={i}>
                        <thead/>
                        <tbody>
                        <tr>
                            <td valign="top"><FontAwesomeIcon icon="check"/></td>
                            <td>{f}</td>
                        </tr>
                        </tbody>
                    </table>
                )}
            </div>
        </div>


    return (
        <section className="mod-info">
            <h2>Welcome to SURF Research Access Management (SRAM)!</h2>
            <p>SRAM is a non-commercial, standards-based service for easy yet secure access management for Dutch led
                research collaborations.
                Spend less time on managing infra structure and access management, and more time on doing
                research.</p>
            <div className="card-container">
                {renderFeatures(managerFeatures, "For team managers")}
                {renderFeatures(memberFeatures, "For team members")}
                {renderFeatures(spFeatures, "For Service Providers")}
                {renderFeatures(institutionFeatures, "For Institutions")}
            </div>
            <ul>
                <li>For intra institute, inter institute, national and international collaboration</li>
                <li>Supplies "access as a service", tailored for researcher collaboration</li>
                <li>Use strong institutional accounts to gain access, or use "guest accounts"</li>
                <li>Based on international standards</li>
                <li>Delivered by <a href="https://www.surf.nl/en"  rel="noopener noreferrer" target="_blank">SURF</a>,
                    partly operated by <a href="https://eduteams.org/" rel="noopener noreferrer" target="_blank">GÉANT eduTEAMS</a></li>
            </ul>
            <p className="footer">For more information on for instance features, you can check out our wiki. You can
                also send us
                an email: <a href="mailto:scz-support@surfnet.nl">scz-support@surfnet.nl</a>.</p>
        </section>
    );
}
