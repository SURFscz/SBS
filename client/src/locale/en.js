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
        organisations: "Organisations",
        services: "Services"
    },
    home: {
        title: "TODO - Home dashboard"
    },
    forms: {
        submit: "Add",
        cancel: "Cancel",
        showMore: "More",
        hideSome: "Less",
        today: "Today",
        manage: "Manage"
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
        actions: "",
        name: "Name",
        namePlaceHolder: "The unique name of a collaboration",
        identifier: "Identifier",
        identifierTooltip: "Generated, unique and immutable<br/>identifier of a collaboration<br/>which used as identifier<br/>for external systems",
        description: "Description",
        descriptionPlaceholder: "The description of the organisation is visible to anyone",
        access_type: "Access Type",
        accessTypePlaceholder: "Select an access type...",
        enrollment: "Enrollment",
        enrollmentPlaceholder: "The enrollment of a collaboration",
        enrollmentTooltip: "Determines the process<br/>in members enrol at<br/>this collaboration",
        message: "Message",
        messagePlaceholder: "Personal message to the administrators",
        messageTooltip: "The message will be included in the<br/>email invitation to the administrators.",
        organisation_name: "Organisation",
        organisationPlaceholder: "Select the organisation for this collaboration...",
        organisationTooltip: "Every collaboration belongs to<br/>minimal one and only one organisation",
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
    collaborationDetail: {
        title: "Details collaboration {{name}}",
        backToCollaborations: "Back to my collaborations",
        backToCollaborationDetail: "Back to my collaboration {{name}}",
        update: "Update",
        delete: "Delete",
        deleteConfirmation: "Are you sure you want to delete this collaboration?",
        deleteMemberConfirmation: "Are you sure you want to delete the collaboration membership for {{name}}?",
        flash: {
            updated: "Collaboration {{name}} was successfully updated",
            deleted: "Collaboration {{name}} was successfully deleted",
            memberDeleted: "Membership of {{name}} was successfully deleted"
        },
        infoBlocks: "Dashboard {{name}}",
        searchPlaceHolder: "Search for members",
        members: "Members of {{name}}",
        member: {
            user__name: "Name",
            user__email: "Email",
            user__uid: "UID",
            role: "Role",
            created_at: "Since",
            actions: ""
        },
        invite: "Invite",

    },
    organisations: {
        dashboard: "Dashboard",
        title: "My Organisations",
        members: "Members",
        collaborations: "Collaborations",
        invitations: "Invitations",
        add: "New",
        searchPlaceHolder: "SEARCH FOR ALL ORGANISATIONS...",
        deleteConfirmation: "Are you sure you want to delete Service {{name}}?"
    },
    services: {
        title: "Services",
        add: "New",
        searchPlaceHolder: "SEARCH FOR ALL SERVICES..."
    },
    service: {
        titleNew: "Create new service",
        titleUpdate: "Update service {{name}}",
        backToServices: "Back to services",
        name: "Name",
        namePlaceHolder: "The unique name of the service",
        entity_id: "Entity ID",
        entity_idPlaceHolder: "The unique entity ID of the service",
        entity_idTooltip: "The unique entity ID of the <br/>Service links the Service<br/>to the external Service Provider",
        description: "Description",
        descriptionPlaceholder: "The description of the service",
        address: "Address",
        addressPlaceholder: "The address of the service",
        identity_type: "Identity type",
        identity_typePlaceholder: "The identity type of the service",
        identity_typeTooltip: "The primary way for<br/>identification for this service",
        uri: "URI",
        uriPlaceholder: "The URI of the service",
        uriTooltip: "URI containing information <br/>about this service",
        accepted_user_policy: "AUP",
        accepted_user_policyPlaceholder: "The Acceptable Use Policy (AUP) of the service",
        accepted_user_policyTooltip: "An acceptable use policy (AUP)<br/>is a document stipulating constraints<br/>and practices that a user<br/>must agree to for access<br/>to a corporate network or<br/>the Internet.",
        contact_email: "Email contact",
        contact_emailPlaceholder: "The email of the contact person of this service",
        contact_emailTooltip: "This email will be<br/>used as primary contact.",
        status: {
            name: "Status",
            active: "Active",
            in_active: "In-active"
        },
        statusPlaceholder: "The status of the service",
        alreadyExists: "A service with {{attribute}} {{value}} already exists.",
        required: "The {{attribute}} is required for a service",
        deleteConfirmation: "Are you sure you want to delete service {{name}}?",
        add: "Create",
        update: "Update",
        delete: "Delete",
        cancel: "Cancel",
        flash: {
            created: "Service {{name}} was successfully created",
            updated: "Service {{name}} was successfully updated",
            deleted: "Service {{name}} was successfully deleted"
        }
    },
    organisation: {
        title: "Add new organisation",
        subTitle: "Enter / edit the organisation details.",
        actions: "",
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
    organisationDetail: {
        backToOrganisations: "Back to my organisations",
        backToOrganisationDetail: "Back to my organisation {{name}}",
        title: "Details organisation {{name}}",
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
            created_at: "Since",
            actions: ""
        },
        invitation: {
            actions: "",
            invitee_email: "Invitee email",
            user__name: "Invited by",
            expiry_date: "Expires",
            noExpires: "N/A",
            message: "Message",
        },
        update: "Update",
        delete: "Delete",
        deleteMemberConfirmation: "Are you sure you want to delete the organisation membership for {{name}}?",
        flash: {
            updated: "Organisation {{name}} was successfully updated",
            deleted: "Organisation {{name}} was successfully deleted",
            memberDeleted: "Membership of {{name}} was successfully deleted"
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
        createTitle: "Send invitations to join organisation {{organisation}}",
        organisationName: "Name",
        organisationDescription: "Description",
        organisationAdministrators: "Administrators",
        requiredAdministrator: "At least one administrator email is required for an invitation for an organisation",
        expiryDate: "Expiry date",
        expiryDateTooltip: "The expiry date of the invitation<br/>After this date the invitation can<br/>not be accepted anymore",
        message: "Message",
        messageTooltip: "The user {{name}} has invited you with this message",
        inviter: "Inviter",
        decline: "Decline",
        accept: "Accept",
        invite: "Invite",
        declineInvitation: "Are you sure you want to decline this invitation?",
        flash: {
            inviteDeclined: "Invitation for organisation {{name}} is declined",
            inviteAccepted: "Invitation for organisation {{name}} is accepted",
            created: "Invitions for organisation {{name}} are created"
        },
    },
    invitation: {
        title: "Invitation to join collaboration {{collaboration}}",
        createTitle: "Send invitations to join collaboration {{collaboration}}",
        collaborationName: "Name",
        collaborationDescription: "Description",
        collaborationAdministrators: "Administrators",
        invitees: "Invitees",
        inviteesPlaceholder: "Invite users by email",
        inviteesTooltip: "This personal message is<br/>included in the mail send <br/>to the persons you invite",
        intendedRole: "Role",
        intendedRoleTooltip: "The intended role for all invitees.<br/><br/>Administrators of an collaboration<br/>can edit their collaborations and<br/>invite members.<br/>Members can only use the services of <br/>their authorisation groups",
        requiredEmail: "At least one email is required for an invitation for a collaboration",
        message: "Message",
        messagePlaceholder: "Personal message to the administrators",
        inviteesMessagesTooltip: "Add emails separated by comma, space <br/>or semi-colon or one-by-on using <br/>the enter key.",
        inviteesMessagePlaceholder: "Personal message to the invitees",
        inviter: "Inviter",
        decline: "Decline",
        accept: "Accept",
        invite: "Invite",
        declineInvitation: "Are you sure you want to decline this invitation?",
        expiryDate: "Expiry date",
        expiryDateTooltip: "The expiry date of the invitation<br/>After this date the invitation can<br/>not be accepted anymore",
        flash: {
            inviteDeclined: "Invitation for collaboration {{name}} is declined",
            inviteAccepted: "Invitation for collaboration {{name}} is accepted",
            created: "Invitations for collaboration {{name}} are successfully created"
        },
    },
    collaborationServices: {
        title: "Services for collaboration {{name}}",
        connectAllServices: "Connect all services to collaboration {{name}}",
        connectAllServicesTooltip: "Before services can be added<br/> to authorisation groups they<br/> first need to be added<br/> to the collaboration.<br/><br/> Connecting all services will <br/>make all services available<br/> to the authorisation groups<br/> of collaboration {{name}}",
        connectedServices: "Connected services to {{name}}",
        searchServices: "Search, select and add services to the available services within collaboration {{name}}",
        deleteServiceTooltip: "Make this service unavailable in<br/> the collaboration {{name}}.<br/><br/><strong>NOTE</strong>: the service itself is NOT deleted.<br/>  It is only not available anymore<br/>  for authorisation groups within<br/>  this collaboration",
        flash: {
            "added": "Successfully added service {{service}} to collaboration {{name}}",
            "deleted": "Successfully deleted service {{service}} from collaboration {{name}}",
            "addedAll": "Successfully added all service to collaboration {{name}}",
            "deletedAll": "Successfully deleted all services from collaboration {{name}}",
        },
        service: {
            actions: "",
            name: "Name",
            entity_id: "Entity ID",
            description: "Description"
        }
    },
    authorisationGroup: {
        title: "Authorisation groups within collaboration {{name}}",
        servicesTitle: "Services for authorisation group {{name}}",
        membersTitle: "Members of authorisation group {{name}}",
        titleNew: "Create new authorisation group",
        titleUpdate: "Update authorisation group {{name}}",
        backToCollaborationAuthorisationGroups: "Back to the authorisation groups of my collaboration {{name}}",
        new: "New",
        searchPlaceHolder: "Search for authorisation groups",
        name: "Name",
        namePlaceholder: "Name of the authorisation group",
        alreadyExists: "A authorisation group with {{attribute}} {{value}} already exists.",
        required: "The {{attribute}} is required for an authorisation group ",
        uri: "URI",
        uriPlaceholder: "URI of the authorisation group",
        description: "Description",
        descriptionPlaceholder: "Description of the authorisation group",
        status: "Status",
        statusPlaceholder: "The status of the authorisation group",
        actions: "",
        open: "",
        deleteConfirmation: "Are you sure you want to delete authorisation {{name}}",
        statusValues: {
            active: "Active",
            in_active: "In-active"
        },
        add: "Create",
        update: "Update",
        delete: "Delete",
        cancel: "Cancel",
        flash: {
            created: "Authorisation group {{name}} was successfully created",
            updated: "Authorisation group {{name}} was successfully updated",
            deleted: "Successfully deleted authorisation group {{name}}",
            addedService: "Successfully added service {{service}} to authorisation group {{name}}",
            deletedService: "Successfully deleted service {{service}} from authorisation group {{name}}",
            addedMember: "Successfully added user {{member}} as a member of authorisation group {{name}}",
            deletedMember: "Successfully deleted user {{member}} from authorisation group {{name}}",
        },
        searchServices: "Search, select and add services to the available services for the authorisation group {{name}}",
        connectedServices: "Connected services to {{name}}",
        deleteServiceTooltip: "Make this service unavailable in<br/> the authorisation group {{name}}.<br/><br/><strong>NOTE</strong>: the service itself is NOT deleted.<br/>It is only not available anymore<br/> for this authorisation groups anymore",
        searchMembers: "Search, select and add members to the authorisation group {{name}}",
        connectedMembers: "Members of {{name}}",
        deleteMemberTooltip: "Remove this member from<br/> the authorisation group {{name}}.<br/><br/><strong>NOTE</strong>: the user itself is NOT deleted.<br/>He / she is only no longer a <br/> member of this authorisation groups anymore",
        service: {
            actions: "",
            name: "Name",
            entity_id: "Entity ID",
            description: "Description"
        },
        member: {
            user__name: "Name",
            user__email: "Email",
            user__uid: "UID",
            role: "Role",
            created_at: "Since",
            actions: ""
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
