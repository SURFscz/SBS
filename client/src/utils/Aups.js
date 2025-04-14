import {isEmpty} from "./Utils";

export function aupData(user, collaboration) {
    const organisation = (collaboration.organisation || {});
    const services = (collaboration.services || []);
    const hasServices = services.some(service => !isEmpty(service.accepted_user_policy));
    const requiresOrganisationAup = !isEmpty(organisation.accepted_user_policy) &&
        !(user.organisation_aups || []).some(aup => aup.organisation_id === organisation.id) &&
        !(organisation.schac_home_organisations || []).some(home => home.name === user.schac_home_organisation);
    const allServiceAupsAgreedOn = services
        .every(service => isEmpty(service.accepted_user_policy) || (user.service_aups || []).some(serviceAup => serviceAup.service_id === service.id));
    return {organisation, services, hasServices, requiresOrganisationAup, allServiceAupsAgreedOn};
}
