SCIM_SCHEMA_CORE = "urn:ietf:params:scim:schemas:core:2.0"
SCIM_API_MESSAGES = "urn:ietf:params:scim:api:messages:2.0"


def _schema(name, schema, attributes):
    return {
        "schemas": [
            f"{SCIM_SCHEMA_CORE}:Schema"
        ],
        "id": schema,
        "meta": {
            "resourceType": "Schema",
            "location": f"/Schemas/{schema}"
        },
        "name": name,
        "Description": f"Defined attributes for the {name} schema",
        "attributes": attributes
    }


def schema_user_template():
    return _schema("User", f"{SCIM_SCHEMA_CORE}:User", [
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


def schema_group_template():
    return _schema("Group", f"{SCIM_SCHEMA_CORE}:Group", [
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


def schemas_template():
    resources = [schema_user_template(), schema_group_template()]

    return {
          "schemas": [
              f"{SCIM_API_MESSAGES}:ListResponse"
          ],
          "totalResults": len(resources),
          "startIndex": 1,
          "itemsPerPage": len(resources),
          "Resources": resources
    }
