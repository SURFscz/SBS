import { describe, it, expect, vi } from 'vitest';
import {aupData} from "../../utils/Aups";


describe('Aup', () => {
it("AupData Schac home member", () => {
    const user = {
        schac_home_organisation: "example.com"
    };
    const collaboration = {
        organisation: {
            name: "org_name",
            schac_home_organisations: ["example.com"]
        },
        services: [
            {accepted_user_policy: "https://aup.org"}
        ]
    }
    const {
        hasServices,
        requiresOrganisationAup,
        allServiceAupsAgreedOn
    } = aupData(user, collaboration);

    expect(hasServices).toEqual(true);
    expect(requiresOrganisationAup).toEqual(false);
    expect(allServiceAupsAgreedOn).toEqual(false);
});

it("AupData services agreed", () => {
    const user = {
        organisation_aups: [
            {organisation_id: 1}
        ],
        service_aups: [
            {service_id: 2}
        ]
    };
    const collaboration = {
        organisation: {
            id: 1
        },
        services: [
            {id: 2, accepted_user_policy: "https://aup.org"}
        ]
    }
    const {
        hasServices,
        requiresOrganisationAup,
        allServiceAupsAgreedOn
    } = aupData(user, collaboration);

    expect(hasServices).toEqual(true);
    expect(requiresOrganisationAup).toEqual(false);
    expect(allServiceAupsAgreedOn).toEqual(true);
});

it("AupData no service AUPS", () => {
    const user = {};
    const collaboration = {
        organisation: {accepted_user_policy: "http://apu.org"},
        services: [{id: 1}]
    }
    const {
        hasServices,
        requiresOrganisationAup,
        allServiceAupsAgreedOn
    } = aupData(user, collaboration);

    expect(hasServices).toEqual(false);
    expect(requiresOrganisationAup).toEqual(true);
    expect(allServiceAupsAgreedOn).toEqual(true);
});

it("AupData defensive coding", () => {
    const {
        hasServices,
        requiresOrganisationAup,
        allServiceAupsAgreedOn
    } = aupData({}, {});

    expect(hasServices).toEqual(false);
    expect(requiresOrganisationAup).toEqual(false);
    expect(allServiceAupsAgreedOn).toEqual(true);
});

});
