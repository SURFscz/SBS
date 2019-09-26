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
            logout: "Logout",
            helpUrl: "https://github.com/SURFscz/SBS/wiki"
        },
        impersonator: "U bent {{impersonator}},<br/>maar u ziet SBS nu als {{currentUser}}.<br/><br/>Op de <strong>Impersonate</strong> pagina<br/> kunt u van identiteit wisselen<br/>of weer 'uzelf' worden."

    },
    navigation: {
        home: "Home",
        registration: "Registratie",
        collaborations: "Samenwerkingen",
        organisations: "Organisaties",
        services: "Diensten",
        profile: "Profiel",
        impersonate: "Impersonate",
    },
    login: {
        title: "Welkom bij het Samenwerking Beheer Systeem",
        subTitle: "Log a.u.b. in."
    },
    home: {
        title: "Mijn samenwerkingen en autorisatiegroepen",
        userServiceProfiles: "Mijn dienstprofielen",
        authorisationGroups: "Autorisatie Groepen",
        collaborations: "Samenwerkingen",
        organisations: "Organisaties",
        backToHome: "Terug naar de startpagina"
    },
    forms: {
        submit: "Toevoegen",
        cancel: "Annuleren",
        showMore: "Meer",
        hideSome: "Minder",
        today: "Vandaag",
        manage: "Overzicht",
        invalidInput: "Foutieve waarde voor {{name}}"
    },
    explain: {
        title: "Uitleg {{subject}}",
        impersonate: "Impersonate"
    },
    user: {
        titleUpdate: "Werk je gebruikersprofiel bij",
        ssh_key: "SSH public key",
        ssh_keyPlaceholder: "Uw publieke SSH sleutel om in te loggen op de dienst",
        ssh_keyTooltip: "Uw publieke SSH sleutel<br/>zal worden uitgewisseld<br/>met de (LDAP van) deze dienst.<br/><br/>U kunt uw publieke SSH sleutel ook uploaden.<br/>Om verborgen bestanden op een Mac te tonen<br/>drukt u op <code>CMD-SHIFT-PERIOD</code>",
        sshKeyError: "Ongeldige SSH sleutel",
        sshConvertInfo: "Dit RFC 4716 SSH-formaat converteren naar het bestandsformaat <code>OpenSSH-key</code> bij het opslaan van het profiel?",
        totp_key: "TOTP sleutel",
        totp_keyPlaceholder: "Uw Google authenticator sleutel",
        totp_keyTooltip: "Google Authenticator sleutel",
        tiqr_key: "Tiqr sleutel",
        tiqr_keyPlaceholder: "Uw Tiqr sleutel",
        tiqr_keyTooltip: "Tiqr sleutel",
        ubi_key: "Uw YubiKey",
        ubi_keyPlaceholder: "Algemene U2F/CTAP support",
        ubi_keyTooltip: "Algemene U2F/CTAP support",
        update: "Bijwerken",
        flash: {
            updated: "Je profiel is bijgewerkt"
        }
    },
    impersonate: {
        title: "Wie wilt u zijn?",
        organisation: "Organisatie",
        organisationPlaceholder: "Voer de naam van een organisatie in om een lijst met zoekresultaten te tonen",
        organisationAdminsOnly: "Toon alleen de beheerders van organisaties",
        collaboration: "Samenwerking",
        collaborationPlaceholder: "Voer de naam van een samenwerking in om een lijst met zoekresultaten te tonen",
        collaborationAdminsOnly: "Toon alleen de beheerders van samenwerkingen",
        user: "Gebruiker",
        userSearchPlaceHolder: "Voer de naam van een gebruiker in die u 'na wilt doen'",
        userRequired: "Kies welke gebruiker u na wilt doen.",
        currentImpersonation: "U doet na",
        noImpersonation: "U bent wie u bent - u doet niemand anders na.",
        currentImpersonationValue: "U ziet SBS nu als {{currentUser}}, maar u bent natuurlijk {{impersonator}}.",
        startImpersonation: "Nadoen",
        clearImpersonation: "Stop met nadoen"
    },
    registration: {
        title: "Vraag toegang tot de resources van {{collaboration}}",
        start: "Start",
        formTitle: "Vraag toegang tot de resources van {{collaboration}}",
        formEndedTitle: "Uw verzoek om lid te worden van {{collaboration}} is verzonden voor review.",
        request: "Vraag aan",
        continue: "Ga door",
        requiredCollaboration: "Ongeldig verzoek. Samenwerking dient gespecificieerd te worden.",
        noJoinRequestCollaboration: "Samenwerking {{name}} ondersteunt geen verzoeken voor lidmaatschap.",
        unknownCollaboration: "De samenwerking met de naam {{collaboration}} bestaat niet.",
        step1: {
            title: "Koppel uw account",
            sub: "Kies organisatie",
            icon: "link",
            tooltip: "U zult doorgestuurd worden om<br/>uw organisatie te kiezen en, nadat<br/>u ingelogd bent, wordt u<br/>doorgestuurd naar stap 2.",
        },
        step2: {
            title: "Vraag toegang aan",
            sub: "Toelichting & voorwaarden",
            icon: "book",
            tooltip: "Nadat u uw organisatie heeft gekozen<br/> kunt u optioneel een motivatie<br/> voor uw verzoek invullen<br/>en onze voorwaarden lezen en accepteren",
            registrationInfo: "We zullen de volgende informatie vastleggen:",
            motivationInfo: "Waarom wilt u lid worden van samenwerking {{collaboration}}?",
            motivationPlaceholder: "Beschrijf uw werk, achtergrond of reden voor uw verzoek tot toegang, zodat de beheerder van de samenwerking kan beoordelen of en welke rechten hij moet toekennen",
            reference: "Kent u al iemand die lid is van {{collaboration}}?",
            referencePlaceholder: "Vul de namen in van mensen die u kent die al lid zijn van {{collaboration}}, zoals mede-onderzoekers",
            policy: "Ons Beleid",
            personalDataConfirmation: "Ik geef toestemming om de persoonlijke data hierboven door te geven aan diensten die zijn gekoppeld aan deze samenwerking.",
            policyConfirmation: "Ik heb de <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"{{aup}}\"'>Acceptable Use Policy (AUP)</a> van {{collaboration}} gelezen en accepteer deze.",
            noAup: "Samenwerking {{name}} heeft geen link opgeven naar een Acceptable Use Policy."
        },
        step3: {
            title: "Wacht op toestemming",
            sub: "Goedgekeurd of afgekeurd",
            icon: "gavel",
            tooltip: "Als laatste stap sturen we een e-mail <br/>naar de beheerder van de samenwerking<br/>die uw verzoek zal goedkeuren of afwijzen.",
            info: "U verzoek is verstuurd naar de beheerder van de samenwerking. Die persoon zal uw verzoek beoordelen.<br/>Zijn / haar beslissing krijgt u te horen via een e-mail.",
            contact: "Als u te lang niets hoort, neem dan contact met ons op via <a href=\"mailto:{{mail}}\">{{mail}}</a>."
        },
        flash: {
            info: "Stap {{step}} is successvol afgerond.",
            success: "Uw verzoek om lid te worden van {{name}} is verzonden voor review.",
            alreadyMember: "Ongeldig verzoek: u bent al lid van de samenwerking {{name}}."
        }
    },
    profile: {
        name: "Naam",
        email: "E-mail",
        uid: "UID",
        affiliation: "Affiliation",
        nick_name: "Roepnaam",
        schac_home_organisation: "Instellingsafkorting",
        edu_members: "EDU lidmaatschap",
        superUser: "Super-User",
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
        dashboardAdmin: "Admin dashboard voor mijn Samenwerkingen",
        dashboardAdminTooltip: "Dit is een overzicht over<br/>alle samenwerkingen waar u<br/>een van de beheerders van bent.",
        title: "Mijn Samenwerkingen",
        requests: "Lidmaatschapsverzoeken",
        authorisations: "Autorisatie-groepen",
        invitations: "Uitnodigingen",
        services: "Diensten",
        add: "Nieuwe samenwerking",
        searchPlaceHolder: "ZOEK OP ALLE SAMENWERKINGEN"
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
        shortName: "Korte naam",
        shortNamePlaceHolder: "Korte naam van de samenwerking",
        shortNameTooltip: "Ken korte namen toe aan de samenwerkingen<br/>zodat die namen bruikbaar zijn in de<br/>via ldap te koppelen diensten (zoals Linux groepsnamen)",
        globalUrn: "Globale urn",
        globalUrnTooltip: "Globale unieke en niet aanpasbare urn<br/>gebaseerd op de korte naam van de organisatie<br/>en deze samenwerking.",
        identifier: "Identifier",
        identifierTooltip: "Gegenereerde, unieke en niet aanpasbare<br/>identifier van een samenwerking<br/>die wordt gebruikt als identifier<br/>voor externe systemen",
        joinRequestUrl: "Lid-worden URL",
        joinRequestUrlTooltip: "URL voor niet-leden om<br/>zich aan te melden voor deze samenwerking.<br/><br/>De URL kan gecommuniceerd worden naar<br/>dienst-aanbieders die hun dienst<br/>via deze samenwerking aanbieden.",
        disableJoinRequests: "Niet-leden kunnen geen verzoek doen om lid te worden",
        disableJoinRequestsTooltip: "Door dit aan te vinken kunnen niet-leden van<br>deze samenwerking geen verzoek doen om lid te worden.",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de samenwerking is voor iedereen zichtbaar",
        access_type: "Toegangs type",
        accessTypePlaceholder: "Kies een toegangs type",
        enrollment: "Lidmaatschapsproces",
        enrollmentPlaceholder: "Lidmaatschapsproces van een samenwerking",
        enrollmentTooltip: "Bepaalt het proces waarmee<br/>leden toegang krijgen tot<br/>deze samenwerking",
        message: "Bericht",
        messagePlaceholder: "Boodschap aan de mensen die u beheerders maakt van deze samenwerking",
        messageTooltip: "De boodschap nemen we op in de <br/>e-mail waarmee beheerders worden uitgenodigd.",
        organisation_name: "Organisatie",
        organisationPlaceholder: "Kies de organisatie voor deze samenwerking",
        organisationTooltip: "Iedere samenwerking hoort bij<br/>precies 1 organisatie",
        accepted_user_policy: "AUP",
        acceptedUserPolicyPlaceholder: "De URL van de Acceptable Use Policy",
        role: "Rol",
        newTitle: "Voeg nieuwe samenwerking toe",
        subTitle: "Beschrijf de samenwerking. U wordt beheerder van de nieuwe samenwerking.",
        alreadyExists: "Een samenwerking met {{attribute}} {{value}} bestaat al in organisatie {{organisation}}.",
        required: "{{attribute}} moet worden ingevuld voor een samenwerking.",
        administrators: "Beheerders",
        administratorsPlaceholder: "Nodig beheerders uit per e-mail",
        administratorsTooltip: "Beheerders van een samenwerking<br/>kunnen de beschrijving aanpassen en<br/>leden uitnodigen.<br/><br/>Voer e-mailadressen in, gescheiden door<br/>een komma, spatie of punt-komma, of voeg<br/>ze stuk voor stuk toe met de enter toets.",
        members: "Normale gebruikers",
        selectRole: "Selecteer een rol.",
        manager: "Manager",
        admin: "Beheerder",
        member: "Normale gebruiker",
        flash: {
            created: "Samenwerking {{name}} is met succes aangemaakt."
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
            updated: "Samenwerking {{name}} is bijgewerkt.",
            deleted: "Samenwerking {{name}} is verwijderd.",
            memberDeleted: "{{name}} is geen lid meer van deze samenwerking.",
            memberUpdated: "De rol of lidmaatschap van {{name}} is bijgewerkt naar {{role}}.",
        },
        infoBlocks: "Dashboard {{name}}",
        searchPlaceHolder: "Zoek leden",
        members: "Leden van {{name}}",
        member: {
            user__name: "Naam",
            user__email: "E-mail",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },
        invite: "Uitnodigen",

    },
    organisations: {
        dashboard: "Dashboard",
        title: "Mijn Organisaties",
        members: "Leden",
        collaborations: "Samenwerkingen",
        invitations: "Uitnodigingen",
        add: "Nieuwe organisatie",
        searchPlaceHolder: "DOORZOEK ALLE ORGANISATIES",
        deleteConfirmation: "Weet u zeker dat u Dienst {{name}} wilt verwijderen?"
    },
    services: {
        title: "Diensten",
        add: "Nieuwe Dienst",
        searchPlaceHolder: "DOORZOEK ALLE DIENSTEN"
    },
    service: {
        titleNew: "Nieuwe dienst aanmaken",
        titleUpdate: "Dienst {{name}} bijwerken",
        titleReadOnly: "Dienst {{name}}",
        backToServices: "Terug naar diensten",
        name: "Naam",
        namePlaceHolder: "De unieke naam van een dienst",
        entity_id: "Entity ID",
        entity_idPlaceHolder: "De unieke entity ID van een dienst",
        entity_idTooltip: "De unieke entity ID van de <br/>dienst koppelt de dienst<br/>aan de externe dienstaanbieder.",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de dienst",
        address: "Adres",
        addressPlaceholder: "Het adres van de dienst",
        identity_type: "Identiteitsoort",
        identity_typePlaceholder: "De identiteitsoort van een dienst",
        identity_typeTooltip: "De primaire manier om deze <br/>deze dienst te identificeren.",
        uri: "URI",
        uriPlaceholder: "De URI van de dienst",
        uriTooltip: "URI waar meer informatie is<br/>te vinden over deze dienst.",
        accepted_user_policy: "AUP",
        accepted_user_policyPlaceholder: "De Acceptable Use Policy (AUP) van de dienst",
        accepted_user_policyTooltip: "Een acceptable use policy (AUP)<br/>is een document waarin staat wat een gebruiker<br/>wel en niet mag/hoort te doen<br/>en waarmee hij akkoord moet gaan<br/>om toegang te krijgen tot een dienst<br/>of systeem.",
        contact_email: "E-mail contact",
        contact_emailPlaceholder: "Het e-mailadres van de contact persoon van deze dienst",
        contact_emailTooltip: "Dit e-mailadres wordt gebruikt<br/>om met de contactpersoon van de dienst te communiceren.",
        status: {
            name: "Status",
            active: "Actief",
            in_active: "Inactief"
        },
        statusPlaceholder: "De status van de dienst",
        alreadyExists: "Een dienst met {{attribute}} {{value}} bestaat al.",
        required: "De dienst heeft {{attribute}} nodig.",
        deleteConfirmation: "Weet u zeker dat u dienst {{name}} wilt verwijderen?",
        add: "Aanmaken",
        update: "Bijwerken",
        delete: "Verwijderen",
        cancel: "Annuleren",
        flash: {
            created: "Dienst {{name}} is aangemaakt.",
            updated: "Dienst {{name}} is bijgewerkt.",
            deleted: "Dienst {{name}} is verwijderd."
        }
    },
    organisation: {
        title: "Nieuwe organisatie toevoegen",
        subTitle: "Wijzig de beschrijving van de organisatie.",
        actions: "",
        name: "Naam",
        namePlaceHolder: "De unieke naam van de organisatie",
        tenantPlaceHolder: "De unieke tenant- / organisatieidentifier die de organisatie verbindt met een instelling",
        shortName: "Korte naam",
        shortNamePlaceHolder: "Korte naam van de organisatie",
        shortNameTooltip: "Ken korte namen toe aan organisaties<br/>zodat deze korte namen kunnen worden gebruikt<br/>in LDAP services (zoals Linux directory namen).",
        description: "Beschrijving",
        descriptionPlaceholder: "De beschrijving van de organisatie is zichtbaar voor iedereen",
        created: "Aangemaakt op",
        message: "Bericht",
        messagePlaceholder: "Bericht voor de beheerders",
        messageTooltip: "Deze tekst voegen we in de e-mail toe<br/>waarmee we de beheerders uitnodigen.",
        alreadyExists: "Er bestaat al een organisatie met {{attribute}} {{value}}.",
        required: "{{attribute}} is een verplicht veld voor een organisatie.",
        administrators: "Beheerders",
        administratorsPlaceholder: "Beheerders uitnodigen per e-mail",
        filePlaceholder: "Kies een csv of txt bestand",
        fileImportResult: "{{nbr}} e-mails ge&iuml;mporteerd uit {{fileName}}.",
        fileExtensionError: "Alleen bestanden met een .csv extensie zijn toegestaan.",
        administratorsTooltip: "Beheerders van een organisatie<br/>kunnen samenwerkingen aanmaken<br/>binnen hun organisatie.<br/><br/>Vul email-adressen van uit te nodigen<br/>mensen in, gescheiden door een komma,<br/>spatie of punt-komma, of voeg ze<br/>stuk-voor-stuk toe via de enter toets.",
        role: "Rol",
        new: "Nieuwe organisatie",
        admin: "Beheerder",
        manager: "Manager",
        member: "Lid",
        yourself: "{{name}} (jijzelf dus)",
        anotherAdmin: "We raden aan meerdere beheerders uit te nodigen.",
        deleteConfirmation: "Weet u zeker dat u deze organisatie wil verwijderen?",
        flash: {
            created: "Organisatie {{name}} is aangemaakt."
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
        newApiKey: "Voeg een nieuwe API-sleutel toe",
        noInvitations: "Geen openstaande uitnodigingen",
        member: {
            user__name: "Naam",
            user__email: "E-mail",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },
        invitation: {
            actions: "",
            invitee_email: "E-mail genodigde",
            user__name: "Uitgenodigd door",
            expiry_date: "Verloopt",
            noExpires: "N/A",
            message: "Bericht",
        },
        collaboration: {
            name: "Naam",
            description: "Omschrijving",
            short_name: "Korte naam",
            global_urn: "Globale urn",
            accepted_user_policy: "AUP",
            created_at: "Sinds",
            actions: "",
            link: ""
        },

        apiKeys: "API-sleutels van {{name}}",
        collaborations: "Samenwerkingen van {{name}}",
        newCollaboration: "Nieuwe samenwerking",
        searchPlaceHolderCollaborations: "Zoek voor samenwerkingen",
        update: "Bijwerken",
        delete: "Verwijderen",
        deleteMemberConfirmation: "Weet u zeker dat u het organisatie lidmaatschap van {{name}} wil verwijderen?",
        deleteApiKeyConfirmation: "Weet u zeker dat u deze API-sleutel wilt verwijderen?",
        deleteCollaborationConfirmation: "Weet u zeker dat u collaboration {{name}} wil verwijderen?",
        flash: {
            updated: "Organisatie {{name}} is bijgewerkt.",
            deleted: "Organisatie {{name}} is verwijderd.",
            memberDeleted: "Lidmaatschap van {{name}} is verwijderd.",
            apiKeyDeleted: "API-sleutel is verwijderd.",
            collaborationDeleted: "Samenwerking {{name}} is verwijderd.",
        }, tabs: {
            form: "Uitnodiging details",
            preview: "Uitnodiging preview",
        }

    },
    joinRequest: {
        title: "Verzoek van {{requester}} om lid te worden van {{collaboration}}",
        message: " Onderbouwing",
        messageTooltip: "De onderbouwing van {{name}} voor dit verzoek",
        reference: "Bekende",
        referenceTooltip: "{{name}} kent de volgende mensen binnen samenwerking {{collaboration}}",
        collaborationName: "Samenwerking",
        userName: "Gebruiker",
        decline: "Afwijzen",
        accept: "Goedkeuren",
        declineConfirmation: "Weet u zeker dat u het verzoek wil afwijzen?",
        flash: {
            declined: "Verzoek voor lidmaatschap van samenwerking {{name}} is afgewezen.",
            accepted: "Verzoek voor lidmaatschap van samenwerking {{name}} is goedgekeurd.",
            notFound: "Dit verzoek voor lidmaatschap is reeds goedgekeurd of afgewezen.",
            alreadyMember: "U bent al lid van de samenwerking {{name}} en daarom kan u deze uitnodiging niet accepteren."
        }
    },
    organisationInvitation: {
        title: "Uitnodiging om lid te worden van {{organisation}}",
        backToOrganisationDetail: "Terug naar mijn organisatie {{name}}",
        createTitle: "Uitnodigingen versturen om lid te worden van organisatie {{organisation}}",
        organisationName: "Naam",
        organisationDescription: "Beschrijving",
        organisationAdministrators: "Beheerders",
        requiredAdministrator: "Er is minimaal 1 e-mailadres van een beheerder nodig voor een uitnodiging.",
        expiryDate: "Verloopdatum",
        expiryDateTooltip: "De verloopdatum van de uitnodiging<br/>Na die datum werkt de uitnodiging niet meer.",
        message: "Bericht",
        messageTooltip: "{{name}} heeft u uitgenodigd met de volgende tekst:",
        fileImportResult: "{{nbr}} e-mailadressen ge&iuml;mporteerd uit {{fileName}}.",
        fileExtensionError: "Alleen bestanden met .csv extensie zijn toegestaan.",
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
        expiredAdmin: "Deze uitnodiging is verlopen op {{expiry_date}}. Verstuur deze opnieuw om de verloopdatum 14 dagen vooruit te zetten.",
        flash: {
            inviteDeclined: "Uitnodiging voor organisatie {{name}} is afgewezen.",
            inviteDeleted: "Uitnodiging voor organisatie {{name}} is verwijderd.",
            inviteResend: "Uitnodiging voor organisatie {{name}} is opnieuw verzonden.",
            inviteAccepted: "Uitnodiging voor organisatie {{name}} is geaccepteerd.",
            created: "Uitnodiging(en) voor organisatie {{name}} aangemaakt.",
            alreadyMember: "De uitnodiging kon niet worden geaccepteerd omdat je al lid bent van deze organisatie.",
            notFound: "Deze uitnodiging is reeds geaccepteerd of afgewezen."
        },
    },
    apiKeys: {
        title: "Nieuwe API-sleutel voor {{organisation}}",
        info: "Met API-sleutels kan de API van SBS worden gebruikt. Zie <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://github.com/SURFscz/SBS/wiki/External-API\"'>de wiki</a> voor meer details.",
        backToOrganisationDetail: "Terug naar mijn organisatie {{name}}",
        secretDisclaimer: "Sla de sleutel op en bewaar deze veilig. Je kan deze sleutel maar één keer zien. Nadat de API-sleutel is opgeslagen kan je deze niet meer opnieuw zien. Bij verlies zal je de sleutel moeten verwijderen en een nieuwe aanmaken.",
        secret: "Sleutel",
        secretValue: "One-way hashed secret",
        secretTooltip: "De sleutel voor in de <code>Authorization Header</code>",
        description: "Omschrijving",
        descriptionPlaceHolder: "Omschrijving voor deze API-sleutel",
        descriptionTooltip: "Een optionele omschrijving betreffende het gebruik van deze API-sleutel",
        flash: {
            created: "API-sleutel voor organisatie {{name}} is aangemaakt.",
        },
        submit: "Opslaan"
    },

    invitation: {
        title: "Uitnodiging om lid te worden van samenwerking {{collaboration}}",
        createTitle: "Verstuur uitnodigingen om lid te worden van samenwerking {{collaboration}}",
        collaborationName: "Naam",
        collaborationDescription: "Beschrijving",
        collaborationAdministrators: "beheerders",
        invitees: "Genodigden",
        inviteesPlaceholder: "Deelnemers uitnodigen via e-mail",
        inviteesTooltip: "Deze tekst nemen we op in de <br/>e-mail waarmee we deelnemers<br/>uitnodigen",
        intendedRole: "Beheersrechten",
        intendedRoleTooltip: "De beheersrechten die alle genodigden krijgen.<br/><br/>Beheerders van een samenwerking<br/>kunnen de gegevens van de samenwerking<br/> wijzigen en leden uitnodigen.<br/>Normale gebruikers kunnen alleen diensten gebruiken <br/>van autorisatiegroepen waar ze lid van zijn.",
        invitee_email: "E-mail genodigde",
        authorisationGroupsPlaceHolder: "Selecteer Autorisatiegroepen",
        authorisationGroupsTooltip: "Selecteer de autorisatiegroepen waar<br/>de genodigde lid van wordt<br/>nadat deze uitnodiging is geaccepteerd.",
        authorisationGroups: "Autorisaties",
        requiredEmail: "U dient minimaal 1 e-mailadres op te geven waar u de uitnodiging om lid te worden naartoe wil sturen.",
        requiredRole: "Je moet de toekomstige rol kiezen voor het collaboratie lidmaatschap.",
        message: "Bericht",
        messagePlaceholder: "Bericht aan de beheerders",
        messageTooltip: "De boodschap nemen we op in de <br/>e-mail waarmee beheerders worden uitgenodigd.",
        inviteesMessagesTooltip: "Voer e-mail adressen in, gescheiden door een komma, spatie <br/>of punt-komma of voer ze stuk-voor-stuk in<br/>met de enter toets.<br/>U kunt ook een csv file inlezen<br/>met daarin komma-gescheiden e-mailadressen.",
        inviteesMessagePlaceholder: "Bericht aan genodigden",
        inviter: "Uitnodiger",
        decline: "Afslaan",
        accept: "Accepteren",
        delete: "Verwijderen",
        resend: "Opnieuw sturen",
        invite: "Uitnodigen",
        declineInvitation: "Weet u zeker dat u de uitnodiging wilt afslaan?",
        deleteInvitation: "Weet u zeker dat u de uitnodiging wilt verwijderen?",
        resendInvitation: "Weet u zeker dat u de uitnodiging opnieuw wil versturen?",
        expired: "De uitnodiging is op {{expiry_date}} verlopen en kan niet meer worden gebruikt.",
        expiredAdmin: "Deze uitnodiging is op {{expiry_date}} verlopen. Verstuur hem opnieuw om de verloopdatum 14 dagen in te toekomst te zetten.",
        filePlaceholder: "Selecteer een csv of txt bestand",
        fileImportResult: "{{nbr}} e-mails ingelezen uit {{fileName}}.",
        fileExtensionError: "Alleen bestanden met een .csv extensie zijn toegestaan.",
        expiryDate: "Verloopdatum",
        expiryDateTooltip: "De verloopdatum van de uitnodiging<br/>Na deze datum kan de uitnodiging <br/>niet meer gebruikt worden.",
        flash: {
            inviteDeclined: "Uitnodiging voor samenwerking {{name}} is afgewezen.",
            inviteAccepted: "Uitnodiging voor samenwerking {{name}} is geaccepteerd.",
            inviteDeleted: "Uitnodiging voor samenwerking {{name}} is verwijderd.",
            inviteResend: "Uitnodiging voor samenwerking {{name}} opnieuw verstuurd.",
            created: "Uitnodigingen voor samenwerking {{name}} zijn aangemaakt."
        },
    },
    collaborationServices: {
        title: "Diensten voor samenwerking {{name}}",
        connectedServices: "Met {{name}} gekoppelde diensten",
        searchServices: "Zoek, kies en voeg diensten toe aan samenwerking {{name}}",
        deleteServiceTooltip: "Maak deze dienst ontoegankelijk voor<br/> samenwerking {{name}}.<br/><br/><strong>LET OP</strong>: de dienst zelf wordt niet verwijderd.<br/>  Hij is alleen niet beschikbaar<br/>voor autorisatie groepen van<br/> deze samenwerking.",
        flash: {
            "added": "{{service}} is toegevoegd aan samenwerking {{name}}.",
            "deleted": "{{service}} is onbeschikbaar gemaakt voor samenwerking {{name}}.",
            "addedAll": "Alle diensten zijn gekoppeld aan samenwerking {{name}}.",
            "deletedAll": "Alle diensten zijn ontkoppeld van samenwerking {{name}}.",
        },
        service: {
            open: "",
            actions: "",
            name: "Naam",
            entity_id: "Entity ID",
            description: "Beschrijving"
        }
    },
    authorisationGroup: {
        title: "Autorisatie groepen in samenwerking {{name}}",
        servicesTitle: "Diensten voor autorisatiegroep {{name}}",
        membersTitle: "Leden van autorisatiegroep {{name}}",
        invitationsTitle: "Openstaande uitnodigingen die lid worden van autorisatiegroep {{name}}",
        pendingInvite: "Openstaande uitnodiging",
        titleNew: "Maak nieuwe autorisatiegroep",
        titleUpdate: "Werk autorisatiegroep {{name}} bij",
        titleReadOnly: "Autorisatiegroep {{name}}",
        backToCollaborationAuthorisationGroups: "Terug naar de autorisatiegroepen van samenwerking {{name}}",
        new: "Nieuw",
        searchPlaceHolder: "Zoek autorisatiegroepen",
        name: "Naam",
        namePlaceholder: "Naam van de autorisatiegroep",
        shortName: "Korte naam",
        shortNamePlaceHolder: "Korte naam van de autorisatiegroep",
        shortNameTooltip: "Ken korte namen toe aan de autorisatiegroepen,<br/>zodat die namen bruikbaar zijn in de<br/>via ldap te koppelen diensten (zoals Linux groepsnamen).",
        autoProvisionMembers: "Maan nieuwe leden van de samenwerking automatisch lid?",
        autoProvisionMembersTooltip: "Check om automatisch alle bestaande leden<br/>en nieuwe leden toe te voegen aan deze autorisatiegroep",
        globalUrn: "Globale urn",
        globalUrnTooltip: "Globale unieke en niet aanpasbare urn<br/>gebaseerd op de korte naam van de organsatie,<br/>samenwerking en deze authorisatiegroep.",
        alreadyExists: "Een autorisatiegroep met {{attribute}} {{value}} bestaat al.",
        required: "{{attribute}} is een verplicht veld voor een autorisatiegroep",
        uri: "URI",
        uriPlaceholder: "URI van de autorisatiegroep",
        description: "Beschrijving",
        descriptionPlaceholder: "Beschrijving van de autorisatiegroep",
        status: "Status",
        statusPlaceholder: "De status van de autorisatiegroep",
        actions: "",
        open: "",
        deleteConfirmation: "Weet u zeker dat u autorisatiegroep {{name}} wilt verwijderen?",
        removeServiceConfirmation: "Weet u zeker dat u de dienst {{name}} wilt verwijderen uit deze autorisatiegroep?",
        removeServiceConfirmationDetails: "De dienstspecifieke informatie van deze gebruiker zal worden verwijderd.",
        removeMemberConfirmation: "Weet u zeker dat u lid {{name}} wilt verwijderen uit deze autorisatiegroep?",
        removeMemberConfirmationDetails: "De dienstspecifieke informatie van deze gebruiker zal worden verwijderd.",
        user: "Gebruiker {{name}}",
        attributes: "Attributen",
        statusValues: {
            active: "Actief",
            in_active: "Inactief"
        },
        add: "Maak aan",
        update: "Werk bij",
        delete: "Verwijder",
        cancel: "Annuleer",
        flash: {
            created: "Autorisatiegroep {{name}} is aangemaakt.",
            updated: "Autorisatiegroep {{name}} is bijgewerkt.",
            deleted: "Autorisatiegroep {{name}} is verwijderd.",
            addedService: "Dienst {{service}} toegevoegd aan autorisatiegroep {{name}}.",
            deletedService: "Dienst {{service}} ontkoppeld van autorisatiegroep {{name}}.",
            addedMember: "Gebruiker {{member}} lid gemaakt van autorisatiegroep {{name}}.",
            addedMembers: "Alle gebruikers lid gemaakt van autorisatiegroep {{name}}.",
            addedServices: "Alle diensten toegevoegd aan autorisatiegroep {{name}}.",
            deletedMember: "Gebruiker {{member}} als lid verwijderd uit autorisatiegroep {{name}}.",
            addedInvitation: "Gebruiker {{member}} succesvol toegevoegd als lid van autorisatiegroep {{name}}.",
            deletedInvitation: "Genodigde {{invitation}} succesvol verwijderd van de autorisatiegroep {{name}}.",
        },
        addAllMembers: "Voeg alle samenwerkingsgebruikers en open staande genodigden toe aan deze autorisatiegroep",
        addAllServices: "Voeg alle samenwerkingsdiensten toe aan deze autorisatiegroep",
        searchServices: "Zoek, kies en voeg diensten toe aan autorisatiegroep {{name}}",
        connectedServices: "Diensten gekoppeld aan {{name}}",
        deleteServiceWarning: "Waarschuwing: ontkoppelen van een dienst van een autorisatiegroep verwijdert alle dienstspecifieke informatie <br/>van gekoppelde leden die via deze groep gekoppeld waren.",
        deleteServiceTooltip: "Maak deze dienst onbeschikbaar voor<br/> autorisatiegroep {{name}}.<br/><br/><strong>LET OP</strong>: de dienst zelf wordt niet verwijderd.<br/>Deze is alleen niet meer beschikbaar<br/> voor deze autorisatiegroep.",
        searchMembers: "Zoek, kies en voeg leden toe aan autorisatiegroep {{name}}",
        connectedMembers: "Leden van {{name}}",
        deleteMemberWarning: "Waarschuwing: door leden uit de autorisatiegroep te verwijderen, wordt alle dienstspecifieke informatie van die gebruiker voor dat lidmaatschap en die dienst verwijderd.",
        deleteMemberTooltip: "Verwijder dit lid uit de<br/>autorisatiegroep {{name}}.<br/><br/><strong>LET OP</strong>: de gebruiker zelf wordt niet verwijderd.<br/>Hij / zij is alleen niet langer lid <br/>van deze autorisatiegroep.",
        deleteInvitationTooltip: "Verwijder deze uitnodiging uit<br/>de autorisatiegroep {{name}}.<br/><br/><strong>LET OP</strong>: de uitnodiging zelf wordt niet verwijderd.<br/>De genodigde zal niet als lid van deze autorisatiegroep<br/>worden toegevoegd als de uitnodiging wordt geaccepteerd.",
        service: {
            actions: "",
            name: "Naam",
            entity_id: "Entity ID",
            description: "Beschrijving"
        },
        member: {
            user__name: "Naam",
            user__email: "E-mail",
            user__uid: "UID",
            role: "Rol",
            created_at: "Sinds",
            actions: ""
        },
        invitation: {
            invitee_email: "E-mail",
            intended_role: "Rol",
            expiry_date: "Verloopdatum",
            actions: ""
        },
    },
    userServiceProfile: {
        title: "Mijn dienstprofielen",
        titleUpdate: "Werk mijn dientprofiel {{name}} bij",
        backToServices: "Terug naar mijn dienstprofielen",
        status: "Status",
        statusPlaceholder: "De status van de dienstprofielen",
        statusValues: {
            active: "Actief",
            in_active: "Inactief"
        },
        open: "",
        service__name: "Dienst",
        authorisation_group__name: "Autorisatie",
        authorisation_group__collaboration__name: "Samenwerking",
        name: "Naam",
        namePlaceholder: "De naam voor dit dienstprofiel",
        email: "E-mail",
        emailPlaceholder: "Uw e-mailadres voor dit dienstprofiel",
        address: "Adres",
        addressPlaceholder: "Uw adres voor dit dienstprofiel",
        identifier: "Identifier",
        identifierPlaceholder: "De identifier voor dit dienstprofiel",
        identifierTooltip: "Uw unieke identifier binnen<br/> de context van dit<br/>dienstprofiel",
        telephone_number: "Mobiel",
        role: "Rol",
        searchPlaceHolder: "Zoek in uw dienstprofielen",
        update: "Bijwerken",
        flash: {
            updated: "Dienstprofiel {{name}} bijgewerkt",
        },

    },
    autocomplete: {
        name: "Name",
        description: "Beschrijving",
        email: "E-mail",
        admin: "Super user",
        organisations: "Organisaties",
        collaborations: "Samenwerkingen",
        link: "Link",
        noResults: "Geen resultaat",
        resultsLimited: "Meer resultaten dan we kunnen tonen; pas uw zoekopdracht aan."

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
        body: "Dit is gênant; er is een onverwachte fout opgetreden. De fout is gerapporteerd. Probeer het nogmaals.",
        ok: "Sluiten"
    },
    not_found: {
        title: "404",
        description_html: "Deze pagina kan niet worden gevonden.",
        loginLink: "LOGIN"
    },
    footer: {
        product: "Powered by SCZ",
        productLink: "https://wiki.surfnet.nl/display/SCZ/Science+Collaboration+Zone+Home",
        privacy: "Terms & Privacy",
        privacyLink: "https://wiki.surfnet.nl/display/SCZ/SCZ+Privacy+Policy"
    }
};

export default I18n.translations.nl;
