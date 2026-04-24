"""
Test that verifies the alignment between the @swag_from Swagger documentation
and the actual 2xx responses returned by each documented API endpoint.

For every endpoint decorated with @swag_from the test will:
  1. Call the endpoint with an appropriate authentication mechanism.
  2. Compare the actual response body against the documented response schema.
  3. Fail with a descriptive report when the documentation and reality diverge.

Validation is strict in both directions:
  - Every property declared in the schema must be present in the response.
  - Every property present in the response must be declared in the schema.
"""

import ast
import os
import re

import yaml
from jsonschema import validate, ValidationError, SchemaError
from jsonschema import Draft4Validator

from server.db.db import db
from server.db.domain import Invitation, User
from server.test.abstract_test import AbstractTest
from server.test.seed import (
    seed,
    co_ai_computing_uuid,
    co_ai_computing_short_name,
    group_ai_researchers_identifier,
    service_storage_token,
    service_network_token,
    service_wiki_token,
    pam_session_id,
    user_sarah_user_token_network,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_SERVER_DIR = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
_SWAGGER_PUBLIC = os.path.join(_SERVER_DIR, "swagger", "public")
_API_DIR = os.path.join(_SERVER_DIR, "api")

# ---------------------------------------------------------------------------
# Schema resolution helpers
# ---------------------------------------------------------------------------

_REF_PREFIX = "/swagger/"


def _load_yaml(path):
    with open(path) as fh:
        return yaml.safe_load(fh)


def _resolve_ref(ref: str):
    """Resolve a $ref value like '/swagger/schemas/Foo.yaml' to an absolute
    file path under server/swagger/public/ and load the YAML."""
    if not ref.startswith(_REF_PREFIX):
        raise ValueError(f"Unexpected $ref format: {ref!r}")
    relative = ref[len(_REF_PREFIX):]
    abs_path = os.path.join(_SWAGGER_PUBLIC, relative)
    return _load_yaml(abs_path)


def _dereference(schema, depth=0):
    """Recursively resolve all $ref nodes in a schema dict.

    Returns a fully inlined schema.  Guard against circular references with a
    depth limit (schemas here are shallow so 20 is more than enough).
    """
    if depth > 20:
        return schema
    if not isinstance(schema, dict):
        return schema

    if "$ref" in schema:
        resolved = _resolve_ref(schema["$ref"])
        return _dereference(resolved, depth + 1)

    return {k: _dereference(v, depth + 1) for k, v in schema.items()}


def _inject_additional_properties_false(schema):
    """Recursively add 'additionalProperties: false' to every object-type
    node in the schema so that jsonschema enforces strict field matching."""
    if not isinstance(schema, dict):
        return schema

    schema_type = schema.get("type")

    if schema_type == "object" or "properties" in schema:
        schema.setdefault("additionalProperties", False)
        for prop_schema in schema.get("properties", {}).values():
            _inject_additional_properties_false(prop_schema)

    if schema_type == "array" and "items" in schema:
        _inject_additional_properties_false(schema["items"])

    # Handle anyOf / allOf / oneOf
    for combiner in ("anyOf", "allOf", "oneOf"):
        for sub in schema.get(combiner, []):
            _inject_additional_properties_false(sub)

    return schema


def _build_strict_schema(response_schema_node):
    """Given the raw 'schema' value from a swagger response, return a fully
    dereferenced, strict (additionalProperties: false) JSON Schema dict."""
    dereferenced = _dereference(response_schema_node)
    _inject_additional_properties_false(dereferenced)
    return dereferenced


# ---------------------------------------------------------------------------
# Endpoint discovery via AST
# ---------------------------------------------------------------------------

def _find_swag_from_endpoints():
    """Scan all server/api/*.py files and collect entries for every function
    decorated with @swag_from(...).

    Returns a list of dicts with keys:
        function_name  – Python function name
        yaml_abs_path  – absolute path to the swagger YAML file
        source_file    – source .py file
    """
    results = []
    for fname in os.listdir(_API_DIR):
        if not fname.endswith(".py"):
            continue
        src_path = os.path.join(_API_DIR, fname)
        with open(src_path) as fh:
            source = fh.read()
        try:
            tree = ast.parse(source, filename=src_path)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef):
                continue
            for decorator in node.decorator_list:
                # Match @swag_from("some/path.yml")
                if (
                    isinstance(decorator, ast.Call)
                    and isinstance(decorator.func, ast.Name)
                    and decorator.func.id == "swag_from"
                    and decorator.args
                    and isinstance(decorator.args[0], ast.Constant)
                ):
                    rel_yaml = decorator.args[0].value
                    # Resolve relative to the source file's directory
                    abs_yaml = os.path.normpath(
                        os.path.join(os.path.dirname(src_path), rel_yaml)
                    )
                    results.append({
                        "function_name": node.name,
                        "yaml_abs_path": abs_yaml,
                        "source_file": src_path,
                    })
    return results


# ---------------------------------------------------------------------------
# Map function names to Flask URL rules
# ---------------------------------------------------------------------------

def _build_url_map(app):
    """Return a dict: function_name -> (methods, url_rule_string)."""
    mapping = {}
    for rule in app.url_map.iter_rules():
        # rule.endpoint is "<blueprint_name>.<function_name>"
        func_name = rule.endpoint.split(".")[-1]
        methods = {m for m in rule.methods if m not in ("HEAD", "OPTIONS")}
        mapping[func_name] = (methods, rule.rule)
    return mapping


# ---------------------------------------------------------------------------
# Authentication header helpers
# ---------------------------------------------------------------------------

def _basic_auth_header(user, password):
    from base64 import b64encode
    token = b64encode(f"{user}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


_UNIHARD_SECRET = None  # populated lazily from seed constant


def _get_unihard_secret():
    """Return the plain-text unihard API secret (available as module-level
    constant from seed after the module has been imported)."""
    from server.test import seed as seed_mod
    return seed_mod.unihard_secret


# ---------------------------------------------------------------------------
# Path-parameter substitution
# ---------------------------------------------------------------------------

# Static mapping: Flask URL variable name -> seed constant value or callable
# Callables receive the app context and return the value.
_PATH_PARAM_MAP = {
    "co_identifier": co_ai_computing_uuid,
    "group_identifier": group_ai_researchers_identifier,
    "user_uid": "urn:john",
    # session_id: we use the seeded PAM session
    "session_id": pam_session_id,
    # service_shortname for the PAM service (storage has pam_web_sso_enabled)
    "service_shortname": "storage",
}


def _substitute_path_params(rule, john_external_id=None):
    """Replace Flask URL variable placeholders <var_name> with seed values."""
    url = rule
    for match in re.finditer(r"<([^>]+)>", rule):
        var_name = match.group(1)
        if var_name in _PATH_PARAM_MAP:
            url = url.replace(f"<{var_name}>", str(_PATH_PARAM_MAP[var_name]))
        elif var_name == "user_external_id":
            if john_external_id:
                url = url.replace(f"<{var_name}>", john_external_id)
        elif var_name == "group_external_id":
            url = url.replace(f"<{var_name}>", group_ai_researchers_identifier)
        # <external_identifier> is handled by the caller after this function
    return url


# ---------------------------------------------------------------------------
# Endpoint category helpers
# ---------------------------------------------------------------------------

def _is_organisation_api(url_rule):
    prefixes = (
        "/api/collaborations",
        "/api/collaborations_services",
        "/api/groups",
        "/api/invitations",
        "/api/organisations",
    )
    return any(url_rule.startswith(p) for p in prefixes)


def _is_scim_api(url_rule):
    return url_rule.startswith("/api/scim")


def _is_pam_api(url_rule):
    return url_rule.startswith("/pam-weblogin")


def _is_token_api(url_rule):
    return url_rule.startswith("/api/tokens")


# ---------------------------------------------------------------------------
# Minimal request bodies per endpoint (function_name -> body dict)
# ---------------------------------------------------------------------------

_REQUEST_BODIES = {
    # POST /api/collaborations/v1
    "save_collaboration_api": {
        "name": "Test swagger CO",
        "description": "Created by swagger alignment test",
        "short_name": "swagger_test_co",
        "disable_join_requests": False,
        "disclose_member_information": False,
        "disclose_email_information": False,
        "administrators": [],
    },
    # PUT /api/collaborations/v1/<co_identifier>/members
    "api_update_user_from_collaboration": {
        "uid": "urn:john",
        "role": "member",
    },
    # PUT /api/collaborations_services/v1/connect_collaboration_service/<co_identifier>
    "connect_collaboration_service_api": {
        "service_entity_id": "https://mail",
    },
    # PUT /api/collaborations_services/v1/connect_collaboration_service (deprecated)
    "connect_collaboration_service_api_deprecated": {
        "short_name": co_ai_computing_short_name,
        "service_entity_id": "https://mail",
    },
    # PUT /api/collaborations_services/v1/disconnect_collaboration_service/<co_identifier>
    "disconnect_collaboration_service_api": {
        "service_entity_id": "https://mail",
    },
    # PUT /api/collaborations_services/v1/disconnect_collaboration_service (deprecated)
    "disconnect_collaboration_service_api_deprecated": {
        "short_name": co_ai_computing_short_name,
        "service_entity_id": "https://mail",
    },
    # POST /api/groups/v1
    "create_group_api": {
        "collaboration_identifier": co_ai_computing_uuid,
        "name": "Swagger Test Group",
        "short_name": "swagger_grp",
        "description": "Group created by swagger alignment test",
        "auto_provision_members": False,
    },
    # PUT /api/groups/v1/<group_identifier>
    "update_group_api": {
        "name": "Swagger Test Group Updated",
        "description": "Updated description",
    },
    # POST /api/groups/v1/<group_identifier>  (add_group_membership)
    "api_add_group_membership": {
        "uid": "urn:john",
    },
    # PUT /api/invitations/v1/collaboration_invites
    "collaboration_invites_api": {
        "collaboration_identifier": co_ai_computing_uuid,
        "invites": ["swagger_test_invite@example.com"],
    },
    # PUT /api/invitations/v1/resend/<external_identifier>
    "resend_external_invitation": {},  # no body required
    # PATCH /api/invitations/v1/update/<external_identifier>
    "update_external_invitation": {
        "intended_role": "member",
    },
    # PAM start
    "start": {
        "user_id": "peter@example.org",
        "attribute": "email",
        "cache_duration": 600,
    },
    # PAM check-pin
    "check_pin": {
        "session_id": pam_session_id,
        "pin": "1234",
    },
    # SCIM sweep
    "sweep": {},
}


# ---------------------------------------------------------------------------
# Endpoints to skip (require live external services or are otherwise untestable
# in the unit-test environment)
# ---------------------------------------------------------------------------

_SKIP_ENDPOINTS = {
    # Calls real remote SCIM server; always returns 400 in test environment
    "sweep",
    # Deprecated connect/disconnect conflict with the non-deprecated variants
    # (same service gets connected/disconnected twice; second call returns 409)
    "connect_collaboration_service_api_deprecated",
    "disconnect_collaboration_service_api_deprecated",
}


# ---------------------------------------------------------------------------
# Main test class
# ---------------------------------------------------------------------------

class TestSwaggerDocumentationAlignment(AbstractTest):
    """Verifies that real API responses match their @swag_from documentation."""

    def _get_invitation_external_identifier(self):
        """Return the external_identifier of a seeded open invitation,
        assigning a fresh UUID if the field is None (it is not auto-populated
        by the seed)."""
        import uuid as _uuid
        invitation = (
            Invitation.query
            .filter(Invitation.status == "open")
            .first()
        )
        self.assertIsNotNone(invitation, "No open invitation found in seed data")
        if invitation.external_identifier is None:
            invitation.external_identifier = str(_uuid.uuid4())
            db.session.merge(invitation)
            db.session.commit()
        return invitation.external_identifier

    # ------------------------------------------------------------------
    # HTTP call helpers
    # ------------------------------------------------------------------

    def _auth_header(self, secret):
        from base64 import b64encode
        token = b64encode(f"Bearer {secret}".encode()).decode()
        return {"Authorization": f"bearer {secret}"}

    def _call_organisation_endpoint(self, method, url, function_name):
        """Call an organisation-API endpoint using the unihard API key."""
        unihard_secret = _get_unihard_secret()
        headers = {"Authorization": f"Bearer {unihard_secret}"}
        body = _REQUEST_BODIES.get(function_name, {})
        return self._raw_call(method, url, headers, body)

    def _call_scim_endpoint(self, method, url, function_name):
        """Call a SCIM endpoint using the monitor service's literal token."""
        headers = {"Authorization": "bearer Axyz_geheim"}
        body = _REQUEST_BODIES.get(function_name, {})
        return self._raw_call(method, url, headers, body)

    def _call_pam_endpoint(self, method, url, function_name):
        """Call a PAM endpoint using the storage service token."""
        headers = {"Authorization": f"bearer {service_storage_token}"}
        body = _REQUEST_BODIES.get(function_name, {})
        if method == "GET":
            return self.client.get(url, headers=headers)
        return self.client.post(url, headers=headers,
                                json=body,
                                content_type="application/json")

    def _call_token_introspect(self):
        """Call /api/tokens/introspect with network service token + sarah's
        user token."""
        headers = {"Authorization": f"bearer {service_network_token}"}
        return self.client.post(
            "/api/tokens/introspect",
            headers=headers,
            data={"token": user_sarah_user_token_network},
            content_type="application/x-www-form-urlencoded",
        )

    def _raw_call(self, method, url, headers, body=None):
        import json as _json
        if method == "GET":
            return self.client.get(url, headers=headers)
        if method == "DELETE":
            return self.client.delete(url, headers=headers,
                                      content_type="application/json")
        if method == "PUT":
            return self.client.put(url, headers=headers,
                                   data=_json.dumps(body),
                                   content_type="application/json")
        if method == "POST":
            return self.client.post(url, headers=headers,
                                    data=_json.dumps(body),
                                    content_type="application/json")
        if method == "PATCH":
            return self.client.patch(url, headers=headers,
                                     data=_json.dumps(body),
                                     content_type="application/json")
        raise ValueError(f"Unsupported method: {method}")

    # ------------------------------------------------------------------
    # Schema validation
    # ------------------------------------------------------------------

    def _get_2xx_schema(self, swagger_doc):
        """Return (status_code, schema_node) for the first 2xx response that
        has a schema defined.  Returns (None, None) if none found."""
        responses = swagger_doc.get("responses", {})
        for code in (200, 201, 202, 204):
            entry = responses.get(code)
            if entry and isinstance(entry, dict) and "schema" in entry:
                return code, entry["schema"]
        # Also check string keys (YAML sometimes gives strings)
        for key, entry in responses.items():
            try:
                code = int(key)
            except (ValueError, TypeError):
                continue
            if 200 <= code < 300 and entry and isinstance(entry, dict) and "schema" in entry:
                return code, entry["schema"]
        return None, None

    def _validate_response(self, actual, strict_schema):
        """Run jsonschema validation.  Returns None on success or an error
        message string on failure."""
        try:
            validate(instance=actual, schema=strict_schema)
            return None
        except (ValidationError, SchemaError) as exc:
            return str(exc)

    # ------------------------------------------------------------------
    # Main test
    # ------------------------------------------------------------------

    def test_swagger_response_alignment(self):
        """Collect all @swag_from endpoints, call each one, and verify the
        response matches the documented schema."""
        # Discover all @swag_from entries and cross-reference with Flask URL map
        swag_entries = _find_swag_from_endpoints()
        url_map = _build_url_map(self.app)

        # Resolve external_identifier once (requires DB context)
        with self.app.app_context():
            invitation_ext_id = self._get_invitation_external_identifier()
            john = User.query.filter(User.uid == "urn:john").one()
            john_external_id = john.external_id
        specs = []
        for entry in swag_entries:
            fname = entry["function_name"]
            if fname not in url_map:
                # Can happen for endpoints registered differently; skip
                continue
            # Skip endpoints that require live external services
            if fname in _SKIP_ENDPOINTS:
                continue
            methods, rule = url_map[fname]
            # Pick the primary HTTP method (exclude GET from DELETE-only etc.)
            method = _pick_method(methods)

            # Resolve path params (use a placeholder for external_identifier to check resolvability)
            url_check = _substitute_path_params(rule, john_external_id)
            url_check = url_check.replace("<external_identifier>", invitation_ext_id)
            # Skip if any param is still unresolved
            if "<" in url_check:
                continue

            swagger_doc = _load_yaml(entry["yaml_abs_path"])
            exp_status, schema_node = self._get_2xx_schema(swagger_doc)

            specs.append({
                "function_name": fname,
                "method": method,
                "rule": rule,
                "exp_status": exp_status,
                "schema_node": schema_node,
                "yaml_path": entry["yaml_abs_path"],
            })

        # Sort: non-destructive first, destructive (DELETE) last
        non_destructive = [s for s in specs if s["method"] != "DELETE"]
        destructive = [s for s in specs if s["method"] == "DELETE"]
        ordered_specs = non_destructive + destructive

        failures = []

        # Track whether a reseed happened so we re-query invitation_ext_id
        needs_ext_id_refresh = False

        for spec in ordered_specs:
            fname = spec["function_name"]
            method = spec["method"]
            rule = spec["rule"]
            exp_status = spec["exp_status"]
            schema_node = spec["schema_node"]

            # Re-resolve invitation external_identifier after any reseed
            if needs_ext_id_refresh and "<external_identifier>" in rule:
                with self.app.app_context():
                    invitation_ext_id = self._get_invitation_external_identifier()
                needs_ext_id_refresh = False

            url = _substitute_path_params(rule, john_external_id)
            url = url.replace("<external_identifier>", invitation_ext_id)
            if "<" in url:
                continue

            # --- Call the endpoint ---
            response = self._dispatch(method, url, fname)

            # --- Check status code ---
            if exp_status is not None and response.status_code != exp_status:
                failures.append(
                    f"[{method} {url}] ({fname})\n"
                    f"  Expected HTTP {exp_status}, got {response.status_code}\n"
                    f"  Response body: {response.data[:500]!r}"
                )
                if method in ("DELETE", "PUT", "POST", "PATCH"):
                    _maybe_reseed(self.app, "DELETE")  # force reseed
                    needs_ext_id_refresh = True
                continue

            # --- Validate body (skip 204 No Content) ---
            if schema_node is not None and exp_status != 204:
                try:
                    actual = response.get_json()
                except Exception:
                    actual = None

                if actual is None:
                    failures.append(
                        f"[{method} {url}] ({fname})\n"
                        f"  Could not parse JSON response body.\n"
                        f"  Raw: {response.data[:500]!r}"
                    )
                else:
                    strict_schema = _build_strict_schema(schema_node)
                    error = self._validate_response(actual, strict_schema)
                    if error:
                        failures.append(
                            f"[{method} {url}] ({fname})\n"
                            f"  Schema mismatch:\n"
                            + _indent(error, 4)
                        )

            # After a DELETE we reseed so subsequent endpoints have data
            if method == "DELETE":
                _maybe_reseed(self.app, method)
                needs_ext_id_refresh = True

        if failures:
            report = (
                f"\n{len(failures)} swagger alignment failure(s):\n"
                + "\n".join(f"\n--- Failure {i + 1} ---\n{f}"
                            for i, f in enumerate(failures))
            )
            self.fail(report)

    # ------------------------------------------------------------------
    # Dispatch helper
    # ------------------------------------------------------------------

    def _dispatch(self, method, url, function_name):
        """Route the call to the correct auth-handling helper."""
        if _is_scim_api(url):
            return self._call_scim_endpoint(method, url, function_name)
        if _is_pam_api(url):
            return self._call_pam_endpoint(method, url, function_name)
        if _is_token_api(url):
            return self._call_token_introspect()
        # Organisation / collaboration / group / invitation endpoints
        return self._call_organisation_endpoint(method, url, function_name)


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _pick_method(methods: set) -> str:
    """Choose a single HTTP method from the set.  Prefer the most
    semantically interesting one when multiple are registered."""
    priority = ["POST", "PUT", "PATCH", "DELETE", "GET"]
    for m in priority:
        if m in methods:
            return m
    return next(iter(methods))


def _maybe_reseed(app, method):
    """Re-seed the database after a destructive operation."""
    if method == "DELETE":
        with app.app_context():
            os.environ["SEEDING"] = "1"
            seed(db, app.app_config)
            del os.environ["SEEDING"]


def _indent(text, spaces):
    pad = " " * spaces
    return "\n".join(pad + line for line in text.splitlines())
