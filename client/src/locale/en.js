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
        registration: "Registration",
        collaborations: "Collaborations"
    },
    registration: {
        title: "Request access to the resources of {{service}}",
        start: "Start",
        formTitle: "Request access to the resources of {{service}}",
        formEndedTitle: "Your request to join {{service}} is sent for review",
        request: "Request",
        continue: "Continue",
        unknownService: "The Service with the ID {{service}} does not exists",
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
            motivationInfo: "Why would you like to join the collaboration {{service}}?",
            motivationPlaceholder: "Describe your work or need to access the resources at the collaboration in order for an admin to grant you the proper user rights?",
            reference: "Do you have a reference within {{service}}?",
            referencePlaceholder: "Write down the names of people you know within {{service}} like co-researchers.",
            policy: "Our Policy",
            policyInfo: "You must agree that your information will be used for resources linked to {{service}}. Please check out <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://wiki.surfnet.nl/display/SCZ/SCZ+Privacy+Policy\"'>Acceptable Use Policy</a> to which you have agreed upon.",
            policyConfirmation: "I have read the User Acceptance Policy of {{service}} and accept it"
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
        organization:"Organization"
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
