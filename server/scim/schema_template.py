SCIM_API_MESSAGES = "urn:ietf:params:scim:api:messages:2.0"

SCIM_SCHEMA_CORE = "urn:ietf:params:scim:schemas:core:2.0"
SCIM_SCHEMA_CORE_USER = f"{SCIM_SCHEMA_CORE}:User"
SCIM_SCHEMA_CORE_GROUP = f"{SCIM_SCHEMA_CORE}:Group"

# Default values that are safe to use during import
SCIM_SCHEMA_SRAM = "urn:example:sram:scim:schemas:1.0"  # Default


def init_scim_schemas(urn):
    """Initialize SCIM SRAM schemas with urn"""
    global SCIM_SCHEMA_SRAM
    SCIM_SCHEMA_SRAM = urn


def get_scim_schema_sram():
    return SCIM_SCHEMA_SRAM


def get_scim_schema_sram_user():
    return f"{get_scim_schema_sram()}:User"


def get_scim_schema_sram_group():
    return f"{get_scim_schema_sram()}:Group"


def _schema(id, attributes):
    return {
        "schemas": [
            f"{SCIM_SCHEMA_CORE}:Schema"
        ],
        "id": id,
        "meta": {
            "resourceType": "Schema",
            "location": f"/Schemas/{id}"
        },
        "name": id,
        "Description": f"Defined attributes for the {id} schema",
        "attributes": attributes
    }


def schema_core_user_template():
    return _schema(SCIM_SCHEMA_CORE_USER, [
        {
            "name": "userName",
            "type": "string",
            "multiValued": False,
            "required": True,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "server"
        },
        {
            "name": "name",
            "type": "complex",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none",
            "subAttributes": [
                {
                    "name": "familyName",
                    "type": "string",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "givenName",
                    "type": "string",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                }
            ]
        },
        {
            "name": "displayName",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "active",
            "type": "boolean",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "emails",
            "type": "complex",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none",
            "subAttributes": [
                {
                    "name": "value",
                    "type": "string",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "primary",
                    "type": "boolean",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                }
            ]
        },
        {
            "name": "x509Certificates",
            "type": "complex",
            "multiValued": True,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none",
            "subAttributes": [
                {
                    "name": "value",
                    "type": "binary",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                }
            ]
        }
    ])


def schema_sram_user_template():
    return _schema(get_scim_schema_sram_user(), [
        {
            "name": "eduPersonScopedAffiliation",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "eduPersonUniqueId",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "voPersonExternalAffiliation",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "voPersonExternalId",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "sramInactiveDays",
            "type": "int",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        }
    ])


def schema_core_group_template():
    return _schema(SCIM_SCHEMA_CORE_GROUP, [
        {
            "name": "displayName",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "members",
            "type": "complex",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none",
            "subAttributes": [
                {
                    "name": "value",
                    "type": "string",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "$ref",
                    "type": "reference",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "immutable",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "display",
                    "type": "string",
                    "multiValued": False,
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                }
            ]
        }
    ])


def schema_sram_group_template():
    return _schema(get_scim_schema_sram_group(), [
        {
            "name": "description",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "urn",
            "type": "string",
            "multiValued": False,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
        {
            "name": "labels",
            "type": "string",
            "multiValued": True,
            "required": False,
            "caseExact": False,
            "mutability": "readOnly",
            "returned": "default",
            "uniqueness": "none"
        },
    ])


def schemas_template():
    resources = [
        schema_core_user_template(),
        schema_core_group_template(),
        schema_sram_user_template(),
        schema_sram_group_template(),
    ]

    return {
          "schemas": [
              f"{SCIM_API_MESSAGES}:ListResponse"
          ],
          "totalResults": len(resources),
          "startIndex": 1,
          "itemsPerPage": len(resources),
          "Resources": resources
    }
