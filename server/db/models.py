# -*- coding: future_fstrings -*-
# -*- coding: future_fstrings -*-
import datetime

from flask import request, session, g as request_context
from werkzeug.exceptions import BadRequest

from server.auth.security import current_user_uid
from server.db.db import db
from server.db.domain import User, CollaborationMembership, OrganisationMembership, JoinRequest, Collaboration, \
    Invitation, Service, Aup, IpNetwork, Group, SchacHomeOrganisation
from server.db.logo_mixin import evict_from_cache

deserialization_mapping = {"users": User, "collaboration_memberships": CollaborationMembership,
                           "join_requests": JoinRequest, "collaborations": Collaboration,
                           "schac_home_organisations": SchacHomeOrganisation,
                           "organisation_memberships": OrganisationMembership, "invitations": Invitation,
                           "services": Service, "aups": Aup, "ip_networks": IpNetwork, "groups": Group}

forbidden_fields = ["created_at", "updated_at"]
date_fields = ["start_date", "end_date", "created_at", "updated_at", "last_accessed_date", "last_login_date",
               "last_activity_date", "membership_expiry_date", "expiry_date"]


def flatten(coll):
    return [item for sublist in coll for item in sublist]


def validate(cls, json_dict, is_new_instance=True):
    required_columns = [coll for coll in cls.__table__.columns._all_columns if
                        not coll.nullable and not coll.server_default]
    if is_new_instance:
        required_columns = [coll for coll in required_columns if not coll.primary_key]
    required_attributes = [coll.name for coll in required_columns if coll.name != "uuid4"]
    missing_attributes = [k for k in required_attributes if k not in json_dict]
    if missing_attributes:
        raise BadRequest(f"Missing attributes '{', '.join(missing_attributes)}' for {cls.__name__}")


def _merge(cls, d):
    o = cls(**d)
    merged = db.session.merge(o)
    db.session.commit()
    if hasattr(merged, "logo"):
        object_type = str(cls._sa_class_manager.mapper.persist_selectable.name)
        uuid4 = getattr(merged, "uuid4")
        evict_from_cache(object_type, uuid4)
    return merged


def add_audit_trail_data(cls, json_dict):
    column_names = list(map(lambda c: c[0], cls.__table__.columns._collection))
    if "created_by" in column_names:
        user_name = current_user_uid() if "user" in session and not session["user"][
            "guest"] else request_context.api_user.name if "api_user" in request_context else "ext_api"
        json_dict["created_by"] = user_name
        if "updated_by" in column_names:
            json_dict["updated_by"] = user_name

    # Also process all relationship children
    relationship_keys = list(filter(lambda k: k in deserialization_mapping, json_dict.keys()))
    for rel in relationship_keys:
        for child in json_dict[rel]:
            add_audit_trail_data(deserialization_mapping[rel], child)


def save(cls, custom_json=None, allow_child_cascades=True, allowed_child_collections=[]):
    json_dict = request.get_json() if custom_json is None else custom_json

    add_audit_trail_data(cls, json_dict)
    json_dict = transform_json(cls, json_dict, allow_child_cascades=allow_child_cascades,
                               allowed_child_collections=allowed_child_collections)

    validate(cls, json_dict)
    return _merge(cls, json_dict), 201


def update(cls, custom_json=None, allow_child_cascades=True, allowed_child_collections=[]):
    json_dict = request.get_json() if custom_json is None else custom_json
    # URL replacement should not override base64 encoded image
    if "logo" in json_dict and json_dict["logo"] and json_dict["logo"].startswith("http"):
        del json_dict["logo"]

    add_audit_trail_data(cls, json_dict)
    json_dict = transform_json(cls, json_dict, allow_child_cascades=allow_child_cascades,
                               allowed_child_collections=allowed_child_collections)

    pk = [coll.name for coll in cls.__table__.columns._all_columns if coll.primary_key][0]

    # This will raise a NoResultFound and result in a 404
    cls.query.filter(cls.__dict__[pk] == json_dict[pk]).one()
    validate(cls, json_dict, is_new_instance=False)
    return _merge(cls, json_dict), 201


def delete(cls, primary_key):
    instance = cls.query.get(primary_key)
    db.session.delete(instance)
    db.session.commit()
    return instance, 204


def cleanse_json(json_dict, cls=None, allow_child_cascades=True, allowed_child_collections=[]):
    if cls:
        column_names = list(map(lambda c: c[0], cls.__table__.columns._collection))
        if allow_child_cascades:
            column_names += list(cls.__dict__.keys())
        elif allowed_child_collections:
            column_names += allowed_child_collections
        # Need to avoid RuntimeError: dictionary changed size during iteration
        for k in list(json_dict.keys()):
            if k not in column_names:
                del json_dict[k]

    for forbidden in forbidden_fields:
        if forbidden in json_dict:
            del json_dict[forbidden]
        for rel in flatten(filter(lambda i: isinstance(i, list), json_dict.values())):
            cleanse_json(rel, allow_child_cascades=allow_child_cascades,
                         allowed_child_collections=[])


def parse_date_fields(json_dict):
    for date_field in date_fields:
        if date_field in json_dict:
            val = json_dict[date_field]
            if isinstance(val, float) or isinstance(val, int):
                json_dict[date_field] = datetime.datetime.fromtimestamp(val / 1e3)
        for rel in flatten(filter(lambda i: isinstance(i, list), json_dict.values())):
            parse_date_fields(rel)


def transform_json(cls, json_dict, allow_child_cascades=True, allowed_child_collections=[]):
    def _contains_list(coll):
        return len(list(filter(lambda item: isinstance(item, list), coll))) > 0

    def _do_transform(items):
        return dict(map(_parse, items))

    def _parse(item):
        if isinstance(item[1], list):
            cls = deserialization_mapping[item[0]]
            return item[0], list(map(lambda i: cls(**_do_transform(i.items())), item[1]))
        return item

    cleanse_json(json_dict, cls=cls, allow_child_cascades=allow_child_cascades,
                 allowed_child_collections=allowed_child_collections)
    parse_date_fields(json_dict)

    if _contains_list(json_dict.values()):
        return _do_transform(json_dict.items())

    return json_dict
