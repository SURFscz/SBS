from server.scim.schema_template import \
    SCIM_API_MESSAGES, SCIM_SCHEMA_CORE, \
    SCIM_SCHEMA_CORE_USER, SCIM_SCHEMA_CORE_GROUP


def _resource_type(name, schema):
    return {
        "description": f"Defined resource types for the {name} schema",
        "endpoint": f"/{name}s",
        "id": f"{name}",
        "meta": {
            "location": f"/ResourceTypes/{name}",
            "resourceType": "ResourceType"
        },
        "name": f"{name}",
        "schema": schema,
        "schemas": [
            f"{SCIM_SCHEMA_CORE}:ResourceType"
        ]
    }


def resource_type_user_template():
    from server.scim.schema_template import get_scim_schema_sram_user

    return _resource_type("User", SCIM_SCHEMA_CORE_USER) | {
        "schemaExtensions": [{
            "schema": get_scim_schema_sram_user(),
            "required": True
        }]
    }


def resource_type_group_template():
    from server.scim.schema_template import get_scim_schema_sram_group

    return _resource_type("Group", SCIM_SCHEMA_CORE_GROUP) | {
        "schemaExtensions": [{
            "schema": get_scim_schema_sram_group(),
            "required": True
        }]
    }


def resource_type_template():
    resources = [resource_type_user_template(), resource_type_group_template()]

    return {
          "schemas": [
              f"{SCIM_API_MESSAGES}:ListResponse"
          ],
          "totalResults": len(resources),
          "startIndex": 1,
          "itemsPerPage": len(resources),
          "Resources": resources
    }
