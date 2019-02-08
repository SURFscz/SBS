import I18n from "i18n-js";

I18n.translations.nl = {
    code: "NL",
    name: "Nederlands",
    select_locale: "Selecteer Nederlands",

    header: {
        title: "Samenwerking Beheer Systeem",
        links: {
            login: "Login",
            help: "Help",
            helpUrl: "https://github.com/SURFscz/SBS/wiki"
        },
        impersonator: "U bent {{impersonator}},<br/>maar u ziet SBS nu als {{currentUser}}.<br/><br/>Op de <strong>Impersonate</strong> pagina<br/> kunt u van identiteit wisselen<br/>of weer 'uzelf' worden."

    },
    navigation: {
        home: "Home",
        registration: "Registratie",
        collaborations: "Samenwerkingen",
        organisations: "Organisaties",
        services: "Services",
        impersonate: "Impersonate",
    },
    login: {
        title: "Welkom bij het Samenwerking Beheer Systeem",
        subTitle: "Log a.u.b. in..."
    },
    home: {
        title: "Samenwerkingen waar ik lid van ben",
        userServiceProfiles: "Mijn service profielen",
        authorisationGroups: "Autorisatie Groepen",
        collaborations: "Samenwerkingen",
        backToHome: "Terug naar de startpagina"
    },
    forms: {
        submit: "Toevoegen",
        cancel: "Annuleren",
        showMore: "Meer",
        hideSome: "Minder",
        today: "Vandaag",
        manage: "Beheren",
        invalidInput: "Foutieve waarde voor {{name}}"
    },
    impersonate: {
        title: "Wie wilt u zijn?",
        organisation: "Organisatie",
        organisationPlaceholder: "Voer de naam van een organisatie in (of *) om een lijst met zoekresultaten te tonen...",
        organisationAdminsOnly: "Toon alleen de beheerders van organisaties",
        collaboration: "Samenwerking",
        collaborationPlaceholder: "Voer de naam van een samenwerking in (of *) om een lijst met zoekresultaten te tonen...",
        collaborationAdminsOnly: "Toon alleen de beheerders van samenwerkingen",
        user: "Gebruiker",
        userSearchPlaceHolder: "Voer de naam van een gebruiker in die u 'na wil doen'...",
        userRequired: "Kies welke gebruiker u na wil doen",
        currentImpersonation: "U doet na",
        noImpersonation: "U bent wie u bent - u doet niemand anders na",
        currentImpersonationValue: "U ziet SBS nu als {{currentUser}}, maar u bent natuurlijk {{impersonator}}",
        startImpersonation: "Nadoen",
        clearImpersonation: "Stop met nadoen"
    },
    registration: {
        title: "Vraag toegang tot de resources van {{collaboration}}",
        start: "Start",
        formTitle: "Vraag toegang tot de resources van {{collaboration}}",
        formEndedTitle: "Uw verzoek om lid te worden van {{collaboration}} is verzonden voor review",
        request: "Vraag aan",
        continue: "Ga door",
        requiredCollaboration: "Ongeldig verzoek. Samenwerking dient gespecificieerd te worden.",
        unknownCollaboration: "De samenwerking met de naam {{collaboration}} bestaat niet",
        step1: {
            title: "Koppel uw account",
            sub: "Kies organisatie",
            icon: "link",
            tooltip: "U zult doorgestuurd worden om<br/>uw organisatie te kiezen en nadat<br/>u ingelogd bent wordt u<br/>doorgestuurd naar stap 2.",
        },
        step2: {
            title: "Vraag toegang aan",
            sub: "Toelichting & voorwaarden",
            icon: "book",
            tooltip: "Nadat u uw organisatie heeft gekozen<br/> kunt u optioneel een motivatie<br/> voor uw verzoek invullen<br/>en onze voorwaarden lezen en accepteren",
            registrationInfo: "We zullen de volgende informatie vastleggen:",
            motivationInfo: "Waarom wilt u lid worden van samenwerking {{collaboration}}?",
            motivationPlaceholder: "Beschrijf uw werk, achtergrond of reden voor uw verzoek tot toegang zodat de beheerder van de samenwerking kan beoordelen of en welke rechten hij moet toekennen.",
            reference: "Kent u al iemand die lid is van {{collaboration}}?",
            referencePlaceholder: "Vul de namen in van mensen die u kent die lid zijn van {{collaboration}}, zoals mede-onderzoekers.",
            policy: "Onze Policy",
            policyInfo: "U dient in te stemmen dat we uw informatie doorgeven aan diensten die zijn gekoppeld aan {{collaboration}}. Lees a.u.b. onze <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://wiki.surfnet.nl/display/SCZ/SCZ+Privacy+Policy\"'>Acceptable Use Policy</a> waar u mee akkoord gaat.",
            policyConfirmation: "I heb de Acceptable Use Policy van {{collaboration}} gelezen en accepteer die"
        },
        step3: {
            title: "Wacht op toestemming",
            sub: "Goedgekeurd of afgekeurd",
            icon: "gavel",
            tooltip: "Als laatste stap sturen we een e-mail <br/>naar de beheerder van de service<br/>die uw verzoek zal goedkeuren of afwijzen.",
            info: "U verzoek is verstuurd naar de beheerder van de samenwerking. Die persoon zal uw verzoek beoordelen.<br/>Zijn / haar beslissing krijgt u te horen via een e-mail",
            contact: "Als u te lang niets hoort, neem dan contact met ons op via <a href=\"mailto:someone@someone\">admin_test@uva.nl</a>"
        },
        flash: {
            info: "Stap {{step}} successvol afgerond."
        }
    },
    profile: {
        name: "Naam",
        email: "E-mail",
        uid: "UID",
        affiliation: "Affiliation",
        nick_name: "Bijnaam",
        schac_home_organisation: "Instellings afkorting",
        edu_members: "EDU lidmaatschap",
        superUser: "Super User",
        role: "Rol",
        member: "Lid",
        admin: "Beheerder",
        organisation: "Organisatie",
        organisations: "Organisaties",
        sbs: "Applicatie",
        collaborations: "Samenwerkingen",
    },
    collaborations: {
        dashboard: "Dashboard",
        title: "Mijn Samenwerkingen",
        requests: "Lidmaatschap verzoeken",
        authorisations: "Autorisatie groepen",
        invitations: "Uitnodigingen",
        services: "Services",
        add: "Nieuw",
        searchPlaceHolder: "ZOEK OP ALLE SAMENWERKINGEN..."
    },
    accessTypes: {
        open: "Open",
        closed: "Besloten",
        on_acceptance: "Na goedkeuring"
    },
    collaboration: {
        title: "Nieuwe samenwerking toevoegen",
        actions: "",
        name: "Naam",
        namePlaceHolder: "De unieke naam van de samenwerking",
        identifier: "Identifier",
        identifierTooltip: "Gegenereerde, unieke en niet aanpasbare<br/>identifier van een samenwerking<br/>die wordt gebruikt als identifier<br/>voor externe systemen",
        joinRequestUrl: "Lid worden URL",
        joinRequestUrlTooltip: "URL voor niet-leden om<br/> zich aan te melden voor deze samenwerking.<br/><br/>De URL kan gecommuniceerd worden naar<br/>dienst-aanbieders die hun dienst<br/>via deze samenwerking aanbieden",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de samenwerking is voor iedereen zichtbaar",
        access_type: "Toegangs type",
        accessTypePlaceholder: "Kies een toegangs type...",
        enrollment: "Enrollment",
        enrollmentPlaceholder: "De enrollment van een samenwerking",
        enrollmentTooltip: "Bepaalt het proces waarmee<br/>leden toegang krijgen tot<br/>deze samenwerking",
        message: "Bericht",
        messagePlaceholder: "Boodschap aan de mensen die u beheerders maakt van deze samenwerking",
        messageTooltip: "De boodschap nemen we op in de <br/>email waarmee beheerders worden uitgenodigd.",
        organisation_name: "Organisatie",
        organisationPlaceholder: "Kies de organisatie voor deze samenwerking...",
        organisationTooltip: "Iedere samenwerking hoort bij<br/>exact 1  organisatie",
        accepted_user_policy: "AUP",
        acceptedUserPolicyPlaceholder: "The URL of the Acceptable Use Policy",
        role: "Rol",
        newTitle: "Voeg nieuwe samenwerking toe",
        subTitle: "Beschrijf de samenwerking. U wordt beheerder van de nieuwe samenwerking.",
        alreadyExists: "Een samenwerking met {{attribute}} {{value}} bestaat al.",
        required: "{{attribute}} moet worden ingevuld voor een samenwerking",
        administrators: "Beheerders",
        administratorsPlaceholder: "Nodig beheerders uit via email",
        administratorsTooltip: "Beheerders van een samenwerking <br/>kunnen de beschrijving aanpassen en<br/>leden uitnodigen.<br/><br/>Voer email-adressen in gescheiden door een komma, spatie <br/>of punt-komma, of voeg ze stuk voor stuk toe <br/>met de enter toets.",
        members: "Leden",
        admin: "Beheerders",
        manager: "Manager",
        member: "Lid",
        flash: {
            created: "Samenwerking {{name}} is met succes aangemaakt"
        }
    },
    collaborationDetail: {
        title: "Details samenwerking {{name}}",
        backToCollaborations: "Terug naar mijn samenwerkingen",
        backToHome: "Terug naar mijn dashboard",
        backToCollaborationDetail: "Terug naar mijn samenwerking {{name}}",
        update: "Bijwerken",
        delete: "Verwijderen",
        deleteConfirmation: "Weet u zeker dat u deze samenwerking wilt verwijderen?",
        deleteMemberConfirmation: "Weet u zeker dat u {{name}} als lid voor deze samenwerking wilt verwijderen?",
        flash: {
            updated: "Samenwerking {{name}} is bijgewerkt",
            deleted: "Samenwerking {{name}} is verwijderd",
            memberDeleted: "{{name}} is geen lid meer van deze zamenwerking",
            memberUpdated: "De rol of lidmaatschap van {{name}} is bijgewerkt naar {{role}}",
        },
        infoBlocks: "Dashboard {{name}}",
        searchPlaceHolder: "Zoek leden",
        members: "Leden van {{name}}",
        member: {
            user__name: "Naam",
            user__email: "Email",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },
        invite: "Nodig uit",

    },
    organisations: {
        dashboard: "Dashboard",
        title: "Mijn Organisaties",
        members: "Leden",
        collaborations: "Samenwerkingen",
        invitations: "Uitnodigingen",
        add: "Nieuw",
        searchPlaceHolder: "DOORZOEK ALLE ORGANISATIES...",
        deleteConfirmation: "Weet u zeker dat u Service {{name}} wilt verwijderen?"
    },
    services: {
        title: "Services",
        add: "Nieuw",
        searchPlaceHolder: "DOORZOEK ALLE SERVICES..."
    },
    service: {
        titleNew: "Nieuwe dienst aanmaken",
        titleUpdate: "Dienst {{name}} bijwerken",
        backToServices: "Terug naar diensten",
        name: "Naam",
        namePlaceHolder: "De unieke naam van een dienst",
        entity_id: "Entity ID",
        entity_idPlaceHolder: "De unieke  entity ID van een dienst",
        entity_idTooltip: "De unieke entity ID van de <br/>dienst koppelt de dienst<br/>aan de externe Service Provider",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de dienst",
        address: "Adres",
        addressPlaceholder: "De adres van de dienst",
        identity_type: "Identiteit soort",
        identity_typePlaceholder: "De identiteit soort van een dienst",
        identity_typeTooltip: "De primaire manier om deze <br/>deze dienst te identificeren",
        uri: "URI",
        uriPlaceholder: "De URI van de dienst",
        uriTooltip: "URI waar meer informatie is<br/>te vinden over deze dienst",
        accepted_user_policy: "AUP",
        accepted_user_policyPlaceholder: "De Acceptable Use Policy (AUP) van de dienst",
        accepted_user_policyTooltip: "Een acceptable use policy (AUP)<br/>is een document waarin staat wat een gebruiker<br/>wel en niet mag/hoort te doen<br/>en waarmee hij akkoord moet gaan<br/>om toegang te krijgen tot een dienst<br/>of systeem.",
        contact_email: "Email contact",
        contact_emailPlaceholder: "Het email-adres van de contact persoon van deze dienst",
        contact_emailTooltip: "Dit email-adres wordt gebruikt<br/>om contact te communiceren.",
        status: {
            name: "Status",
            active: "Active",
            in_active: "Inactive"
        },
        statusPlaceholder: "De status van de dienst",
        alreadyExists: "Een dienst met {{attribute}} {{value}} bestaat al.",
        required: "De dienst heeft {{attribute}} nodig",
        deleteConfirmation: "Weet u zeker dat u dienst {{name}} wilt verwijderen?",
        add: "Aanmaken",
        update: "Bijwerken",
        delete: "Verwijderen",
        cancel: "Annuleren",
        flash: {
            created: "Dienst {{name}} is aangemaakt",
            updated: "Dienst {{name}} is bijgewerkt",
            deleted: "Dienst {{name}} is verwijderd"
        }
    },
    organisation: {
        title: "Nieuwe organisatie toevoegen",
        subTitle: "Wijzig de beschrijving van de organisatie.",
        actions: "",
        name: "Naam",
        namePlaceHolder: "De unieke naam van de organisatie",
        tenant_identifier: "Tenant identifier",
        tenantPlaceHolder: "De unieke tenant / organisatie identifier die de organisatie verbindt met een instelling",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de organisatie is zichtbaar voor iedereen",
        created: "Aangemaakt op",
        message: "Bericht",
        messagePlaceholder: "Bericht voor de beheerders",
        messageTooltip: "Deze tekst voegen we in de email toe<br/>waarmee we de beheerders uitnodigen.",
        alreadyExists: "Er bestaat al een organisatie met {{attribute}} {{value}}.",
        required: "{{attribute}} is een verplicht veld voor een organisatie",
        administrators: "Beheerders",
        administratorsPlaceholder: "Beheerders uitnodigen via email",
        filePlaceholder: "Kies een csv of txt bestand...",
        fileImportResult: "{{nbr}} emails geimporteerd uit {{fileName}}",
        fileExtensionError: "Alleen bestanden met een .csv extensie zijn toegestaan",
        administratorsTooltip: "Beheerders van een organisatie <br/>kunnen samenwerkingen aanmaken binnen hun organisatie.<br/><br/>Vul email-adressen van uit te nodigen mensen in, gescheiden door een komma, spatie <br/>of punt-komma, of voeg ze stuk-voor-stuk toe via <br/>de enter toets.",
        role: "Rol",
        admin: "Beheerder",
        manager: "Manager",
        member: "Lid",
        yourself: "{{name}} (jij zelf dus)",
        anotherAdmin: "We raden aan meerdere beheerders uit te nodigen.",
        deleteConfirmation: "Weet u zeker dat u deze organisatie wil verwijderen?",
        flash: {
            created: "Organisatie {{name}} is aangemaakt"
        }
    },
    organisationDetail: {
        backToOrganisations: "Terug naar mijn organisaties",
        backToOrganisationDetail: "Terug naar mijn organisatie {{name}}",
        title: "Beschrijving organisatie {{name}}",
        back: "Terug naar mijn organisaties",
        members: "Leden van {{name}}",
        invitations: "Uitnodigingen voor {{name}}",
        searchPlaceHolder: "Zoek leden",
        invite: "Nodig uit",
        noInvitations: "Geen openstaande uitnodigingen",
        member: {
            user__name: "Naam",
            user__email: "Email",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },
        invitation: {
            actions: "",
            invitee_email: "Email genodigde",
            user__name: "Uitgenodigd door",
            expiry_date: "Verloopt",
            noExpires: "N/A",
            message: "Bericht",
        },
        update: "Bijwerken",
        delete: "Verwijderen",
        deleteMemberConfirmation: "Weet u zeker dat u het organisatie lidmaatschap van {{name}} wil verwijderen?",
        flash: {
            updated: "Organisatie {{name}} bijgewerkt",
            deleted: "Organisatie {{name}} verwijderd",
            memberDeleted: "Lidmaatschap van {{name}} verwijderd"
        }
    },
    joinRequest: {
        title: "Verzoek van {{requester}} om lid te worden van {{collaboration}}",
        message: " Onderbouwing",
        messageTooltip: "De onderbouweing van {{name}} voor dit verzoek",
        reference: "Bekende",
        referenceTooltip: "{{name}} kent de volgende mensen binnen samenwerking {{collaboration}}",
        collaborationName: "Samenwerking",
        userName: "Gebruiker",
        decline: "Keur af",
        accept: "Keur goed",
        declineConfirmation: "Weet u zeker dat u het verzoek wil afwijzen?",
        flash: {
            declined: "Verzoek voor lidmaatschap van samenwerking {{name}} is afgekeurd",
            accepted: "Verzoek voor lidmaatschap van samenwerking {{name}} is goedgekeurd",
        }
    },
    organisationInvitation: {
        title: "Uitnodiging om lid te worden van {{organisation}}",
        backToOrganisationDetail: "Terug naar mijn organisatie {{name}}",
        createTitle: "Uitnodigingen versturen om lid te worden van organisatie {{organisation}}",
        organisationName: "Naam",
        organisationDescription: "Beschrijving",
        organisationAdministrators: "Beheerders",
        requiredAdministrator: "Er is minimaal 1 email adres van een beheerder administrator nodig voor een uitnodiging",
        expiryDate: "Verloopdatum",
        expiryDateTooltip: "De verloopdatum van de uitnodiging<br/>Na die datum werkt de uitnodiging niet meer",
        message: "Bericht",
        messageTooltip: "{{name}} heeft u uitgenodigd met de volgende tekst",
        fileImportResult: "{{nbr}} email adressen geimporteerd uit {{fileName}}",
        fileExtensionError: "Alleen bestanden met .csv extensie zijn toegestaan",
        inviter: "Uitnodiger",
        decline: "Afslaan",
        accept: "Accepteren",
        invite: "Uitnodigen",
        delete: "Verwijderen",
        resend: "Opnieuw verzenden",
        declineInvitation: "Weet u zeker dat u de uitnodiging wilt afslaan?",
        deleteInvitation: "Weet u zeker dat u de uitnodiging wilt verwijderen?",
        resendInvitation: "Weet u zeker dat u de uitnodiging opnieuw wil versturen?",
        expired: "Deze uitnodiging is verlopen op {{expiry_date}} en kan niet meer geaccepteerd worden",
        expiredAdmin: "Deze uitnodiging is verlopen op {{expiry_date}}. Verstuur hem opnieuw om de verloopdatum 14 dagen vooruit te zetten",
        flash: {
            inviteDeclined: "Uitnodiging voor organisatie {{name}} is afgewezen",
            inviteDeleted: "Uitnodiging voor organisatie {{name}} is verwijderd",
            inviteResend: "Uitnodiging voor organisatie {{name}} is opnieuw verzonden",
            inviteAccepted: "Uitnodiging voor organisatie {{name}} is geaccepteerd",
            created: "Uitnodiging(en) voor organisatie {{name}} aangemaakt"
        },
    },
    invitation: {
        title: "Uitnodiging om lid te worden van samenwerking {{collaboration}}",
        createTitle: "Verstuurd uitnodigingen om lid te worden van samenwerking {{collaboration}}",
        collaborationName: "Naam",
        collaborationDescription: "Beschrijving",
        collaborationAdministrators: "beheerders",
        invitees: "Genodigden",
        inviteesPlaceholder: "Mensen uitnodigen via email",
        inviteesTooltip: "Deze tekst nemen we op in de <br/>email waarmee we mensen <br/>uitnodigen",
        intendedRole: "Rol",
        intendedRoleTooltip: "De rol die alle genodigden standaard krijgen.<br/><br/>Beheerders van een samenwerking<br/>kunnen de gegevens van de samenwerking<br/> wijzigen en leden uitnodigen.<br/>Leden kunnen alleen diensten gebruiken <br/>van autorisatie groepen waar ze lid van zijn",
        invitee_email: "Email genodigde",
        requiredEmail: "U dient minimaal 1 email-adres op te geven waar u de uitnodiging om lid te worden naartoe wil sturen",
        message: "Bericht",
        messagePlaceholder: "Bericht aan de beheerders",
        inviteesMessagesTooltip: "Voer email adressen in, gescheiden door een komma, spatie <br/>of punt-komma of voer ze stuk-voor-stuk in<br/>met de enter toets.<br/>U kunt ook een csv file inlezen<br/>met daarin komma-gescheiden email-adressen.",
        inviteesMessagePlaceholder: "Bericht aan genodigden",
        inviter: "Uitnodiger",
        decline: "Afslaan",
        accept: "Accepteren",
        delete: "Verwijderen",
        resend: "Opnieuw sturen",
        invite: "Uitnodiging",
        declineInvitation: "Weet u zeker dat u de uitnodiging wilt afslaan?",
        deleteInvitation: "Weet u zeker dat u de uitnodiging wilt verwijderen?",
        resendInvitation: "Weet u zeker dat u de uitnodiging opnieuw wil versturen?",
        expired: "De uitnodiging is op {{expiry_date}} verlopen en kan niet meer worden gebruikt",
        expiredAdmin: "Deze uitnodiging is op {{expiry_date}} verlopen. Verstuur hem opnieuw om de verloopdatum 14 dagen in te toekomst te zetten",
        filePlaceholder: "Selecteer een csv of txt bestand...",
        fileImportResult: "{{nbr}} emails ingelezen uit {{fileName}}",
        fileExtensionError: "Alleen bestanden met een .csv extensie zijn toegestaan",
        expiryDate: "Verloopdatum",
        expiryDateTooltip: "De verloopdatum van de uitnodiging<br/>Na deze datum kan de uitnodiging <br/>niet meer gebruikt worden",
        flash: {
            inviteDeclined: "Uitnodiging voor samenwerking {{name}} is afgewezen",
            inviteAccepted: "Uitnodiging voor samenwerking {{name}} is geaccepteerd",
            inviteDeleted: "Uitnodiging voor samenwerking {{name}} is verwijderd",
            inviteResend: "Uitnodiging voor samenwerking {{name}} opnieuw verstuurd",
            created: "Uitnodigingen voor samenwerking {{name}} zijn aangemaakt"
        },
    },
    collaborationServices: {
        title: "Diensten voor samenwerking {{name}}",
        connectAllServices: "Koppel alle diensten aan samenwerking {{name}}",
        connectAllServicesTooltip: "Voordat diensten aan autorisatie <br/> groepen gekoppeld kunnen worden moeten<br/> ze eerst worden toegevoegd aan <br/> de samenwerking.<br/><br/> Door alle diensten te koppelen, worden <br/>ze beschikbaar voor alle<br/> autorisatie groepen<br/> van samenwerking {{name}}",
        connectedServices: "Met {{name}} gekoppelde diensten",
        searchServices: "Zoek, kies en voeg diensten toe aan samenwerking {{name}}",
        deleteServiceTooltip: "Maak deze dienst ontoegankelijk voor<br/> samenwerking {{name}}.<br/><br/><strong>LET OP</strong>: de dienst zelf wordt niet verwijderd.<br/>  Hij is alleen niet beschikbaar<br/>voor autorisatie groepen van<br/> deze samenwerking",
        flash: {
            "added": "{{service}} is toegevoegd aan samenwerking {{name}}",
            "deleted": "{{service}} is onbeschikbaar gemaakt voor samenwerking {{name}}",
            "addedAll": "Alle diensten zijn gekoppeld aan samenwerking {{name}}",
            "deletedAll": "Alle diensten zijn ontkoppeld van samenwerking {{name}}",
        },
        service: {
            actions: "",
            name: "Naam",
            entity_id: "Entity ID",
            description: "Beschrijving"
        }
    },
    authorisationGroup: {
        title: "Autorisatie groepen in samenwerking {{name}}",
        servicesTitle: "Diensten voor autorisatie groep {{name}}",
        membersTitle: "Leden van autorisatie groep {{name}}",
        titleNew: "Maak nieuwe autorisatie groep",
        titleUpdate: "Werk autorisatie groep {{name}} bij",
        titleReadOnly: "Autorisatie groep {{name}}",
        backToCollaborationAuthorisationGroups: "Terug naar de autorisatie groepen van samenwerking {{name}}",
        new: "Nieuw",
        searchPlaceHolder: "Zoek autorisatie groepen",
        name: "Naam",
        namePlaceholder: "Naam van de autorisatie groep",
        shortName: "Korte naam",
        shortNamePlaceholder: "Korte naam van de autorisatie groep",
        shortNameTooltip: "Ken korte namen toe aan de autorisatie groepen<br/>zodat die namen bruikbaar zijn in de<br/>via ldap te koppelen diensten (zoals Linux groepsnamen)",
        alreadyExists: "Een autorisatie groep met {{attribute}} {{value}} bestaat al.",
        required: "{{attribute}} is een verplicht veld voor een autorisatie groep",
        uri: "URI",
        uriPlaceholder: "URI van de autorisatie groep",
        description: "Beschrijving",
        descriptionPlaceholder: "Beschrijving van de autorisatie groep",
        status: "Status",
        statusPlaceholder: "De status van de autorisatie groep",
        actions: "",
        open: "",
        deleteConfirmation: "Weet u zeker dat u autorisatie groep {{name}} wilt verwijderen",
        statusValues: {
            active: "Active",
            in_active: "Inactive"
        },
        add: "Maak aan",
        update: "Werk bij",
        delete: "Verwijder",
        cancel: "Annuleer",
        flash: {
            created: "Autorisatie groep {{name}} is aangemaakt",
            updated: "Autorisatie groep {{name}} is bijgewerkt",
            deleted: "Autorisatie groep {{name}} is verwijderd",
            addedService: "Dienst {{service}} toegevoegd aan autorisatie groep {{name}}",
            deletedService: "Dienst {{service}} ontkoppeld van autorisatie groep {{name}}",
            addedMember: "Gebruiker {{member}} lid gemaakt van autorisatie groep {{name}}",
            deletedMember: "Gebruiker {{member}} als lid verwijderd uit autorisatie groep {{name}}",
        },
        searchServices: "Zoek, kies en voeg diensten toe aan autorisatie groep {{name}}",
        connectedServices: "Diensten gekoppeld aan {{name}}",
        deleteServiceWarning: "Waarschuwing: ontkoppelen van een dienst van een autorisatie groep verwijdert alle dienst specifieke informatie <br/>van gekoppelde leden die via deze groep gekoppeld waren",
        deleteServiceTooltip: "Maak deze dienst onbeschikbaar voor<br/> autorisatie groep {{name}}.<br/><br/><strong>LET OP</strong>: de dienst zelf wordt niet verwijderd.<br/>Hijis alleen niet meer beschikbaar<br/> voor deze autorisatie groep",
        searchMembers: "Zoek, kies en voeg leden toe aan autorisatie groep {{name}}",
        connectedMembers: "Leden van {{name}}",
        deleteMemberWarning: "Waarschuwing: door leden uit de autorisatie groep te verwijderen, wordt alle dienst-speficieke informatie van die gebruiker voor dat lidmaatschap en die dienst verwijderd",
        deleteMemberTooltip: "Verwijder dit lid uit de<br/>autorisatie groep {{name}}.<br/><br/><strong>LET OP</strong>: de gebruiker zelf wordt niet verwijderd.<br/>Hij / zij is alleen niet langer lid <br/>van deze autorisatie groep",
        service: {
            actions: "",
            name: "Naam",
            entity_id: "Entity ID",
            description: "Beschrijving"
        },
        member: {
            user__name: "Naam",
            user__email: "Email",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },

    },
    userServiceProfile: {
        title: "Mijn dienst profielen",
        titleUpdate: "Werk mijn dient profile {{name}} bij",
        backToServices: "Terug naar mijn dienst profielen",
        status: "Status",
        statusPlaceholder: "The status van de dienst profielen",
        statusValues: {
            active: "Active",
            in_active: "In-active"
        },
        open: "",
        service__name: "Dienst",
        authorisation__name: "Autorisatie",
        collaboration_membership__collaboration__name: "Samenwerking",
        name: "Naam",
        namePlaceholder: "De naam voor dit dienst profiel",
        email: "Email",
        emailPlaceholder: "Uw email-adres voor dit dienstprofiel",
        address: "Adres",
        addressPlaceholder: "Uw adres voor dit dienstprofiel",
        identifier: "Identifier",
        identifierPlaceholder: "De identifier voor dit dienstprofiel",
        identifierTooltip: "Uw unieke identifier binnen<br/> de context van dit<br/>dienstprofiel",
        ssh_key: "SSH public key",
        ssh_keyPlaceholder: "Uw publiek SSH key om in te loggen op de dienst",
        ssh_keyTooltip: "Uw publieke SSH key<br/>zal worden uitgewisseld<br/>met de (LDAP van) deze dienst.<br/><br/>U kunt uw publieke SSH-key ook uploaden.<br/>Om verborgen bestanden op een Mac te tonen<br/>drukt u <code>CMD-SHIFT-PERIOD</code>",
        sshKeyError: "Ongeldige SSH key",
        role: "Rol",
        searchPlaceHolder: "Zoek in uw dienstprofielen...",
        update: "Bijwerken",
        flash: {
            updated: "Dienstprofiel {{name}} bijgewerkt",
        },

    },
    autocomplete: {
        name: "Name",
        description: "Beschrijving",
        email: "Email",
        admin: "Super user",
        organisations: "Organisaties",
        collaborations: "Samenwerkingen",
        link: "Link",
        noResults: "Geen resultaat",
        resultsLimited: "Meer resultaten dan we kunnen tonen; pas uw zoekopdracht aan..."

    },
    inputField: {
        fileImport: "Bestand inlezen",
    },
    confirmationDialog: {
        title: "Bevestig actie",
        confirm: "Bevestig",
        cancel: "Annuleer",
        leavePage: "Weet u zeker dat u deze pagina wil verlaten?",
        leavePageSub: "Wijzigingen die niet zijn opgeslagen worden niet bewaard.",
        stay: "Blijf",
        leave: "Verlaat deze pagina"
    },

    error_dialog: {
        title: "Onverwachte fout",
        body: "Dit is gênant; er is een onverwachte fout opgetreden. De fout is gerapporteerd. Probeer het nogmaals...",
        ok: "Sluiten"
    },
    not_found: {
        title: "404",
        description_html: "Deze pagina kan niet worden gevonden.",
        loginLink: "Consider to login..."
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

export default I18n.translations.nl;
