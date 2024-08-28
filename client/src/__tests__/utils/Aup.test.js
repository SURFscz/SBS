import {aupData} from "../../utils/Aups";

test("AupData Schac home member", () => {
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

test("AupData services agreed", () => {
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
