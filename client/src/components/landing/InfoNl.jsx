import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import "./info.scss";

export default function InfoNl() {

    const managerFeatures = ["Creëer uw team (CO / VO)", "Koppel diensten", "Nodig teamleden uit", "Beheer wie toegang heeft en tot wat"];
    const memberFeatures = ["Ontvang een uitnodiging", "Gebruik uw instellings-ID of een gastaccount om toegang te krijgen tot onderzoeksbronnen", "Beheer uw profiel, SSH-sleutels, enz. op 1 plek", "Besteed minder tijd aan wachten, en meer tijd aan onderzoekssamenwerking"];
    const spFeatures = ["Sluit uw dienst aan (LDAP, SAML, OIDC)", "Configureer (de)provisioning", "Verbeter de beveiliging", "Besteed minder tijd aan ondersteuning"];
    const institutionFeatures = ["Verbeter ondersteuning aan onderzoekers", "Verbeter de beveiliging (AVG / GDPR): geen nul-uren contracten enz.", "Zichtbaarheid verbeteren van welke onderzoekers waar/waaraan werken", "Configureer welke werknemers teams kunnen aanmaken"];

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
                toegangsbeheer voor door Nederlandse instellingen geleidde onderzoekssamenwerkingen.
                Besteed minder tijd aan het beheren van infrastructuur en toegangsbeheer, en meer tijd aan het doen
                van onderzoek. </ p>
            <div className="card-container">
                {renderFeatures(managerFeatures, "Voor team managers")}
                {renderFeatures(memberFeatures, "Voor team leden")}
                {renderFeatures(spFeatures, "Voor dienstaanbieders")}
                {renderFeatures(institutionFeatures, "Voor instellingen")}
            </div>
            <ul>
                <li> Voor intra-instituut, inter-instituut, nationale- en internationale samenwerking</li>
                <li> Levert "toegang als een service", op maat gemaakt voor samenwerking tussen onderzoekers</li>
                <li> Gebruik sterke institutionele accounts om toegang te krijgen, of gebruik "gastaccounts"</li>
                <li> Gebaseerd op internationale normen</li>
                <li> Geleverd door <a href="https://www.surf.nl/en" rel="noopener noreferrer" target="_blank">SURF</a>, 
                    gedeeltelijk beheerd door <a href="https://eduteams.org/" rel="noopener noreferrer" target="_blank">GÉANT eduTEAMS</a></li>
            </ ul>
            <p className="footer"> Voor meer informatie over bijvoorbeeld functies, kunt u onze wiki bekijken. Of stuur ons
                een e-mail: <a href="mailto:scz-support@surfnet.nl">scz-support@surfnet.nl</a>.</p></section>
    );
}
