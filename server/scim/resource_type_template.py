from server.scim.schema_template import SCIM_SCHEMA_CORE, SCIM_API_MESSAGES


def _resource_type(name):
    return {
        "description": f"Defined resource types for the {name} schema",
        "endpoint": f"/{name}s",
        "id": f"{name}",
        "meta": {
            "location": f"/ResourceTypes/{name}",
            "resourceType": "ResourceType"
        },
        "name": f"{name}",
        "schema": f"{SCIM_SCHEMA_CORE}:{name}",
        "schemas": [
            f"{SCIM_SCHEMA_CORE}:ResourceType"
        ]
    }


def resource_type_user_template():
    return _resource_type("User")


def resource_type_group_template():
    return _resource_type("Group")


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
