def arp_attributes():
    return {
        "urn:mace:dir:attribute-def:eduPersonAssurance": [{
            "value": "*",
            "source": "idp",
            "motivation": "Reserved for future use: accessing some types of services or data via SRAM might require "
                          "additional assurances by the IdP (for example, user needs to be logged in with a second "
                          "factor); this will in the future be conveyed in eduPersonAssurance."
        }],
        "urn:mace:dir:attribute-def:cn": [{
            "value": "*",
            "source": "idp",
            "motivation": "Name attributes are necessary for fellow researchers to be able to identify and find their "
                          "collaboration members."
        }],
        "urn:mace:dir:attribute-def:displayName": [{
            "value": "*",
            "source": "idp",
            "motivation": "Name attributes are necessary for fellow researchers to be able to identify and find their "
                          "collaboration members."
        }],
        "urn:mace:dir:attribute-def:mail": [{
            "value": "*",
            "source": "idp",
            "motivation": "SRAM needs to be able to send mails to users, for example if there are outstanding actions "
                          "in the platform (user needs to accept invitation, approve membership, etc)"
        }],
        "urn:mace:dir:attribute-def:eduPersonEntitlement": [{
            "value": "*",
            "source": "idp",
            "motivation": "This entitlement is used to convey which institutional users are allowed to create COs in "
                          "SRAM without prior institutional approval."
        }],
        "urn:mace:dir:attribute-def:givenName": [{
            "value": "*",
            "source": "idp",
            "motivation": "Name attributes are necessary for fellow researchers to be able to identify and find their "
                          "collaboration members."
        }],
        "urn:mace:dir:attribute-def:uid": [{
            "value": "*",
            "source": "idp",
            "motivation": "The uid attribute is necessary to be able to handle 2-factor authentication using "
                          "SURFsecureID"
        }],
        "urn:mace:dir:attribute-def:eduPersonScopedAffiliation": [{
            "value": "*",
            "source": "idp",
            "motivation": "ScopedAffiliation can be used to verify that a user who want to join a collaboration really "
                          "is accredited; in addition, some services might use this attribute to grant more rights to "
                          "local users."
        }],
        "urn:mace:dir:attribute-def:sn": [{
            "value": "*",
            "source": "idp",
            "motivation": "Name attributes are necessary for fellow researchers to be able to identify and find their "
                          "collaboration members."
        }],
        "urn:mace:dir:attribute-def:eduPersonPrincipalName": [{
            "value": "*",
            "source": "idp",
            "motivation": "Some services (for example, SURFResearchDrive) need eduPersonPrincipalName to match users "
                          "who log in via SRAM to users who are already in their system (for example, because they "
                          "have used this service via SURFconext before)."
        }],
        "urn:mace:dir:attribute-def:eduPersonTargetedID": [{
            "value": "*",
            "source": "idp",
            "motivation": "eduPersonTargetedId is used to uniquely identify a user."
        }],
        "urn:mace:terena.org:attribute-def:schacHomeOrganization": [{
            "value": "*",
            "source": "idp",
            "motivation": "The schacHomeOrganization attribute is necessary to be able to handle 2-factor "
                          "authentication using SURFsecureID"
        }],
        "urn:mace:surf.nl:attribute-def:ssh-key": [{
            "value": "*",
            "source": "idp",
            "motivation": "The SSHKey is necessary to enable passwordless login on SRAM enabled servers"
        }]
    }
