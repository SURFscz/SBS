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
    forms: {
        submit: "Add",
        cancel: "Cancel",
        showMore: "More",
        hideSome: "Less"
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
    accessTypes: {
        open: "Open",
        closed: "Closed",
        on_acceptance: "On acceptance"
    },
    collaboration: {
        title: "Add new collaboration",
        name: "Name",
        namePlaceHolder: "The unique name of a collaboration",
        identifier: "Identifier",
        description: "Description",
        descriptionPlaceholder: "The description of the organisation is visible to anyone",
        access_type: "Access Type",
        accessTypePlaceholder: "Select an access type...",
        enrollment: "Enrollment",
        message: "Message",
        messagePlaceholder: "Personal message to the administrators",
        messageTooltip: "The message will be included in the<br/>email invitation to the administrators.",
        organisation_name: "Organisation",
        organisationPlaceholder: "Select the organisation for this collaboration...",
        organisationTooltip: "Every collaboration belongs to<br/> minimal one and only one organisation",
        accepted_user_policy: "AUP",
        acceptedUserPolicyPlaceholder: "The URL of the Accepted User Policy",
        role: "Role",
        newTitle: "Add new collaboration",
        subTitle: "Enter / edit the collaboration details. You will become an administrator of the new collaboration.",
        alreadyExists: "An collaboration with {{attribute}} {{value}} already exists.",
        required: "The {{attribute}} is required for an collaboration",
        administrators: "Administrators",
        administratorsPlaceholder: "Invite administrators by email",
        administratorsTooltip: "Administrators of an collaboration <br/>can edit their collaborations and<br/>invite members.<br/><br/>Add emails separated by comma, space <br/>or semi-colon or one-by-on using <br/>the enter key.",
        members: "Members",
        admin: "Administrator",
        manager: "Manager",
        member: "Member",
        flash: {
            created: "Collaboration {{name}} was successfully created"
        }
    },
    organisations: {
        dashboard: "Dashboard",
        title: "My Organisations",
        members: "Members",
        collaborations: "Collaborations",
        invitations: "Invitations",
        add: "New",
        searchPlaceHolder: "SEARCH FOR ALL ORGANISATIONS..."
    },
    organisation: {
        title: "Add new organisation",
        subTitle: "Enter / edit the organisation details.",
        name: "Name",
        namePlaceHolder: "The unique name of an organisation",
        tenant_identifier: "Tenant identifier",
        tenantPlaceHolder: "The unique tenant / organisation identifier linking the organisation to an institution",
        description: "Description",
        descriptionPlaceholder: "The description of the organisation is visible to anyone",
        created: "Created at",
        message: "Message",
        messagePlaceholder: "Personal message to the administrators",
        messageTooltip: "The message will be included in the<br/>email invitation to the administrators.",
        alreadyExists: "An organisation with {{attribute}} {{value}} already exists.",
        required: "The {{attribute}} is required for an organisation",
        administrators: "Administrators",
        administratorsPlaceholder: "Invite administrators by email",
        administratorsTooltip: "Administrators of an organisation <br/>can create collaborations in their organisations.<br/><br/>Add emails separated by comma, space <br/>or semi-colon or one-by-on using <br/>the enter key.",
        role: "Role",
        admin: "Administrator",
        manager: "Manager",
        member: "Member",
        yourself: "{{name}} (it's You)",
        anotherAdmin: "It is highly recommended to invite administrators.",
        deleteConfirmation: "Are you sure you want to delete this organisation?",
        flash: {
            created: "Organisation {{name}} was successfully created"
        }
    },
    organisationDetail :{
        backToOrganisations: "Back to my organisations",
        title: "Organisation {{name}}",
        back: "Back to my organisations",
        members: "Members of {{name}}",
        invitations: "Invitations for {{name}}",
        searchPlaceHolder: "Search for members",
        invite: "Invite",
        noInvitations: "No pending invitations",
        member: {
            user__name: "Name",
            user__email: "Email",
            user__uid: "UID",
            role: "Role",
            created_at: "Since"
        },
        invitation: {
            invitee_email: "Invitee email",
            user__name: "Invited by",
            expiry_date: "Expires",
            noExpires: "N/A",
            message: "Message",
        },
        update: "Update",
        delete: "Delete",
        flash :{
            updated: "Organisation {{name}} was successfully updated",
            deleted: "Organisation {{name}} was successfully deleted"
        }
    },
    joinRequest: {
        title: "Join request from {{requester}} for collaboration {{collaboration}}",
        message: " Motivation",
        messageTooltip: "The motivation from {{name}} for this join request",
        reference: "Reference",
        referenceTooltip: "The references {{name}} has within collaboration {{collaboration}}",
        collaborationName: "Collaboration",
        userName: "User",
        decline: "Decline",
        accept: "Accept",
        declineConfirmation: "Are you sure you want to decline this join request?",
        flash: {
            declined: "Join request for collaboration {{name}} is declined",
            accepted: "Join request for collaboration {{name}} is accepted",
        }
    },
    organisationInvitation: {
        title: "Invitation to join organisation {{organisation}}",
        organisationName: "Name",
        organisationDescription: "Description",
        organisationAdministrators: "Administrators",
        message: "Message",
        messageTooltip: "The user {{name}} has invited you with this message",
        inviter: "Inviter",
        decline: "Decline",
        accept: "Accept",
        declineInvitation: "Are you sure you want to decline this invitation?",
        flash: {
            inviteDeclined: "Invitation for organisation {{name}} is declined",
            inviteAccepted: "Invitation for organisation {{name}} is accepted",
        },
    },
    invitation: {
        title: "Invitation to join collaboration {{collaboration}}",
        collaborationName: "Name",
        collaborationDescription: "Description",
        collaborationAdministrators: "Administrators",
        message: "Message",
        messageTooltip: "The user {{name}} has invited you with this message",
        inviter: "Inviter",
        decline: "Decline",
        accept: "Accept",
        declineInvitation: "Are you sure you want to decline this invitation?",
        flash: {
            inviteDeclined: "Invitation for collaboration {{name}} is declined",
            inviteAccepted: "Invitation for collaboration {{name}} is accepted",
        },
    },
    autocomplete: {
        name: "Name",
        description: "Description",
        link: "Link",
        noResults: "No results",
        resultsLimited: "More entries matched than can be shown, please narrow your search term..."

    },
    confirmationDialog: {
        title: "Please confirm",
        confirm: "Confirm",
        cancel: "Cancel",
        leavePage: "Do you really want to leave this page?",
        leavePageSub: "Changes that you made will not be saved.",
        stay: "Stay",
        leave: "Leave"
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
