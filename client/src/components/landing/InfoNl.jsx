import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./info.scss";

export default function InfoNl() {

    const managerFeatures = ["Creëer uw team (CO / VO)", "Connect services", "Teamleden uitnodigen / aan boord", "Beheer wie toegang heeft tot wat"];
    const memberFeatures = ["Ontvang uitgenodigd", "Gebruik uw instellings-ID of een gastaccount om toegang te krijgen tot onderzoeksbronnen", "Beheer uw profiel, SSH-sleutels, enz. eenmaal", "Minder tijd besteed aan wachten, meer tijd voor onderzoekssamenwerking"];
    const spFeatures = ["Verbind uw service (LDAP, SAML, OIDC)", "Configureer (de) provisioning", "Beveiliging verbeteren", "Geniet van minder tijd met ondersteuning"];
    const institutionFeatures = ["Ondersteuning voor onderzoekers verbeteren", "Beveiliging verbeteren (AVG / GDPR): geen nul-uren contractaccounts enz.", "Zichtbaarheid verbeteren van welke onderzoekers waar / waar aan werken", "Configureren welke werknemers teams kunnen maken"];

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
            <h2> Welkom bij SURF Research Access Management (SRAM)! </h2>
            <p> SRAM is een niet-commerciële, op standaarden gebaseerde service voor eenvoudig maar veilig
                toegangsbeheer voor Nederlandse gebruikers
                onderzoekssamenwerkingen.
                Besteed minder tijd aan het beheren van infrastructuur en toegangsbeheer en meer tijd aan het doen
                onderzoek. </ p>
            <div className="card-container">
                {renderFeatures(managerFeatures, "Voor team managers")}
                {renderFeatures(memberFeatures, "Voor team members")}
                {renderFeatures(spFeatures, "Voor dienstaanbieders")}
                {renderFeatures(institutionFeatures, "Voor instellingen")}
            </div>
            <ul>
                <li> Voor intra-instituut, inter-instituut, nationale en internationale samenwerking</li>
                <li> Levert "toegang als een service", op maat gemaakt voor samenwerking tussen onderzoekers</li>
                <li> Gebruik sterke institutionele accounts om toegang te krijgen, of gebruik "gastaccounts"</li>
                <li> Gebaseerd op internationale normen</li>
                <li> Geleverd door <a href="https://www.surf.nl/en" rel="noopener noreferrer" target="_blank"> SURF </a>,
                    gedeeltelijk beheerd door <a href="https://eduteams.org/" rel="noopener noreferrer" target="_blank"> GÉANT eduTEAMS </a></li>
            </ ul>
            <p className="footer"> Voor meer informatie over bijvoorbeeld functies, kunt u onze wiki bekijken. Jij kan
                stuur ons ook
                een e-mail: <a href="mailto:scz-support@surfnet.nl"> scz-support@surfnet.nl </a>. </p></section>
    );
}
