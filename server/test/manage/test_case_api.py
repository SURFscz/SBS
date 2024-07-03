from unittest import TestCase

from server.db.domain import Service
from server.manage.api import service_applies_for_external_sync


class TestCaseApi(TestCase):

    def test_service_applies_for_external_sync_saml_enabled(self):
        service = Service(name="Test", saml_enabled=True)
        self.assertFalse(service_applies_for_external_sync(service))

    def test_service_applies_not_for_external_sync(self):
        service = Service(name="Test")
        self.assertFalse(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_saml_ok(self):
        service = Service(name="Test", saml_enabled=True, saml_metadata="XML")
        self.assertTrue(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_saml_with_url(self):
        service = Service(name="Test", saml_enabled=True, saml_metadata_url="http://localhost/metadata")
        self.assertTrue(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_oidc_enabled(self):
        service = Service(name="Test", oidc_enabled=True)
        self.assertFalse(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_oidc_no_redirect(self):
        service = Service(name="Test", oidc_enabled=True, grants="authorization_code")
        self.assertFalse(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_oidc_no_grant(self):
        service = Service(name="Test", oidc_enabled=True, redirect_urls="http://localhost/redirect")
        self.assertFalse(service_applies_for_external_sync(service))

    def test_service_applies_for_external_sync_oidc_ok(self):
        service = Service(name="Test", oidc_enabled=True, grants="authorization_code",
                          redirect_urls="http://localhost/redirect")
        self.assertTrue(service_applies_for_external_sync(service))
