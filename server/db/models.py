import datetime

from flask import request, session, g as request_context

from server.db.db import db, User, CollaborationMembership, OrganisationMembership, JoinRequest, Collaboration, \
    Invitation, Service, UserServiceProfile, AuthorisationGroup


def _flatten(l):
    return [item for sublist in l for item in sublist]


def validate(cls, json_dict, is_new_instance=True):
    required_columns = {k: v for k, v in cls.__table__.columns._data.items() if
                        not v.nullable and (not v.server_default or v.primary_key)}
    required_attributes = required_columns.keys()
    if is_new_instance:
        required_attributes = filter(lambda k: not required_columns[k].primary_key, required_attributes)
    missing_attributes = list(filter(lambda key: key not in json_dict, required_attributes))
    if len(missing_attributes) > 0:
        raise Exception(f"Missing attributes '{', '.join(missing_attributes)}' for {cls.__name__}")


def _merge(cls, d):
    o = cls(**d)
    merged = db.session.merge(o)
    db.session.commit()
    return merged


def save(cls):
    if not request.is_json:
        return None, 415

    json_dict = transform_json(request.get_json())
    add_audit_trail_data(cls, json_dict)

    validate(cls, json_dict)
    return _merge(cls, json_dict), 201


def add_audit_trail_data(cls, json_dict):
    column_names = cls.__table__.columns._data.keys()
    if "created_by" in column_names:
        user_name = session["user"]["uid"] if "user" in session and not session["user"][
            "guest"] else request_context.api_user
        json_dict["created_by"] = user_name
        if "updated_by" in column_names:
            json_dict["updated_by"] = user_name


def update(cls):
    if not request.is_json:
        return None, 415

    json_dict = transform_json(request.get_json())
    add_audit_trail_data(cls, json_dict)

    pk = list({k: v for k, v in cls.__table__.columns._data.items() if v.primary_key}.keys())[0]
    instance = cls.query.filter(cls.__dict__[pk] == json_dict[pk])
    if not instance:
        return None, 404
    validate(cls, json_dict, is_new_instance=False)
    return _merge(cls, json_dict), 201


def delete(cls, primary_key):
    pk = list({k: v for k, v in cls.__table__.columns._data.items() if v.primary_key}.keys())[0]
    row_count = cls.query.filter(cls.__dict__[pk] == primary_key).delete()
    db.session.commit()
    return (None, 204) if row_count > 0 else (None, 404)


deserialization_mapping = {"users": User, "collaboration_memberships": CollaborationMembership,
                           "join_requests": JoinRequest, "user_service_profiles": UserServiceProfile,
                           "collaborations": Collaboration, "organisation_memberships": OrganisationMembership,
                           "invitations": Invitation, "authorisation_groups": AuthorisationGroup,
                           "services": Service}

forbidden_fields = ["created_at", "updated_at", "created_by", "updated_by"]
date_fields = ["start_date", "end_date", "created_at", "updated_at"]


def cleanse_json(json_dict):
    for forbidden in forbidden_fields:
        if forbidden in json_dict:
            del json_dict[forbidden]
        for rel in _flatten(filter(lambda i: isinstance(i, list), json_dict.values())):
            cleanse_json(rel)


def parse_date_fields(json_dict):
    for date_field in date_fields:
        if date_field in json_dict:
            val = json_dict[date_field]
            if isinstance(val, float) or isinstance(val, int):
                json_dict[date_field] = datetime.datetime.fromtimestamp(val / 1e3)
        for rel in _flatten(filter(lambda i: isinstance(i, list), json_dict.values())):
            parse_date_fields(rel)


def transform_json(json_dict):
    def _contains_list(coll):
        return len(list(filter(lambda item: isinstance(item, list), coll))) > 0

    def _do_transform(items):
        return dict(map(_parse, items))

    def _parse(item):
        if isinstance(item[1], list):
            cls = deserialization_mapping[item[0]]
            return item[0], list(map(lambda i: cls(**_do_transform(i.items())), item[1]))
        return item

    cleanse_json(json_dict)
    parse_date_fields(json_dict)

    if _contains_list(json_dict.values()):
        return _do_transform(json_dict.items())

    return json_dict
