import I18n from "i18n-js";

I18n.translations.en = {
    code: "EN",
    name: "English",
    select_locale: "Select English",

    header: {
        title: "Collaboration Management System",
        links: {
            login: "Login"
        }
    },
    navigation: {
        home: "Home",
        registration: "Registration",
        collaborations: "Collaborations",
        organisations: "Organisations"
    },
    home: {
        title: "TODO - Home dashboard"
    },
    registration: {
        title: "Request access to the resources of {{collaboration}}",
        start: "Start",
        formTitle: "Request access to the resources of {{collaboration}}",
        formEndedTitle: "Your request to join {{collaboration}} is sent for review",
        request: "Request",
        continue: "Continue",
        requiredCollaboration: "Invalid request. Collaboration need to be specified.",
        unknownCollaboration: "The Collaboration with the with the name {{collaboration}} does not exists",
        step1: {
            title: "Link your account",
            sub: "Select organization",
            icon: "link",
            tooltip: "You will be redirected to select<br/>your organization and after you<br/>have logged in you will be<br/>redirected to proceed with step 2.",
        },
        step2: {
            title: "Request access",
            sub: "Motivation & Terms",
            icon: "book",
            tooltip: "When you have chosen your organization<br/> then you'll need to optionally <br/>motivate your request <br/>and review & accept our terms",
            registrationInfo: "We will registrate the following information:",
            motivationInfo: "Why would you like to join the collaboration {{collaboration}}?",
            motivationPlaceholder: "Describe your work or need to access the resources at the collaboration in order for an admin to grant you the proper user rights?",
            reference: "Do you have a reference within {{collaboration}}?",
            referencePlaceholder: "Write down the names of people you know within {{collaboration}} like co-researchers.",
            policy: "Our Policy",
            policyInfo: "You must agree that your information will be used for resources linked to {{collaboration}}. Please check out <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://wiki.surfnet.nl/display/SCZ/SCZ+Privacy+Policy\"'>Acceptable Use Policy</a> to which you have agreed upon.",
            policyConfirmation: "I have read the User Acceptance Policy of {{collaboration}} and accept it"
        },
        step3: {
            title: "Wait for approval",
            sub: "Approved or denied",
            icon: "gavel",
            tooltip: "As a last step we will sent a mail <br/>to the administrator of the service<br/>who wil either approve or deny your request.",
            info: "Your request has been sent to the collaboration manager who will review your appliance.<br/>His / hers decision will be communicated to you by e-mail",
            contact: "Still haven't received a message from us. Please contact us via <a href=\"mailto:someone@someone\">admin_test@uva.nl</a>"
        },
        flash: {
            info: "Step {{step}} successfully finished."
        }
    },
    profile: {
        name: "Name",
        email: "E-mail",
        organization: "Organization"
    },
    collaborations: {
        dashboard: "Dashboard",
        title: "My Collaborations",
        requests: "Join Requests",
        authorisations: "Authorisations",
        invitations: "Invitations",
        services: "Services",
        profile: "Profile",
        add: "New",
        searchPlaceHolder: "SEARCH FOR ALL COLLABORATIONS..."
    },
    collaboration: {
        name: "Name",
        identifier: "Identifier",
        description: "Description",
        access_type: "Access Type",
        enrollment: "Enrollment",
        organisation_name: "Organisation",
        accepted_user_policy: "AUP",
        role: "Role",
        newTitle: "Add new collaboration",
        subTitle: "Enter / edit the collaboration details. You will become an administrator of the new Collaboration.",
        members: "Members",
        admin: "Administrator",
        manager: "Manager",
        member: "Member"

    },
    organisations: {
        dashboard: "Dashboard",
        title: "My Organisations",
        members: "Members",
        collaborations: "Collaborations",
        profile: "Profile",
        add: "New",
        searchPlaceHolder: "SEARCH FOR ALL ORGANISATIONS..."
    },
    organisation: {
        title: "Add new organisation",
        subTitle: "Enter / edit the organisation details.",
        name: "Name",
        namePlaceHolder: "The unique name of an organisation",
        tenant: "Tenant identifier",
        tenantPlaceHolder: "The unique tenant / organisation identifier linking the organisation to an institution",
        description: "Description",
        descriptionPlaceholder: "The description of the organisation is visible to anyone",
        alreadyExists: "An organisation with {{attribute}} {{value}} already exists.",
        members: "Members",
        role: "Role",
        admin: "Administrator",
        manager: "Manager",
        member: "Member",
        yourself: "{{name}} (it's You)",
        anotherAdmin: "It is highly recommended to invite another administrator."
    },
    autocomplete: {
        name: "Name",
        description: "Description",
        link: "Link",
        noResults: "No results",
        resultsLimited: "More entries matched than can be shown, please narrow your search term..."

    },
    error_dialog: {
        title: "Unexpected error",
        body: "This is embarrassing; an unexpected error has occurred. It has been logged and reported. Please try again...",
        ok: "Close"
    },
    not_found: {
        title: "404",
        description_html: "The requested page could not be found"
    },
    footer: {
        product: "Powered by SCZ",
        productLink: "https://wiki.surfnet.nl/display/SCZ/Science+Collaboration+Zone+Home",
        privacy: "Terms & Privacy",
        privacyLink: "https://wiki.surfnet.nl/display/SCZ/SCZ+Privacy+Policy",
        contact: "helpdesk@surfnet.nl",
        contactLink: "mailto:helpdesk@surfnet.nl?subject=SCZ"
    }
};

export default I18n.translations.en;
