import uuid

import responses

from server.db.domain import Service
from server.manage.api import sync_external_service, delete_external_service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_storage_name, service_cloud_name
from server.tools import read_file


class TestApi(AbstractTest):

    def _resolve_manage_base_url(self):
        manage_base_url = self.app.app_config.manage.base_url
        return manage_base_url[:-1] if manage_base_url.endswith("/") else manage_base_url

    @responses.activate
    def test_save_oidc_service_happy_flow(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self._resolve_manage_base_url()
            url = f"{manage_base_url}/manage/api/internal/metadata"
            external_identifier = str(uuid.uuid4())
            res_mock.add(responses.POST, url, json={"id": external_identifier, "version": 0}, status=200)
            updated_service = sync_external_service(self.app, service)

            self.assertEqual(external_identifier, updated_service.export_external_identifier)
            self.assertEqual(0, updated_service.export_external_version)
            self.assertTrue(updated_service.export_successful)
            self.assertIsNotNone(updated_service.exported_at)

    @responses.activate
    def test_save_oidc_service_manage_bad_request(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        self.login("urn:john")
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self._resolve_manage_base_url()
            url = f"{manage_base_url}/manage/api/internal/metadata"
            res_mock.add(responses.POST, url, json={"error": "BadRequest"}, status=400)
            updated_service = sync_external_service(self.app, service)

            self.assertIsNone(updated_service.export_external_version)
            self.assertFalse(updated_service.export_successful)
            self.assertIsNotNone(updated_service.exported_at)

    def test_save_oidc_service_manage_no_connection(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        self.login("urn:john")
        updated_service = sync_external_service(self.app, service)

        self.assertIsNone(updated_service.export_external_version)
        self.assertFalse(updated_service.export_successful)
        self.assertIsNotNone(updated_service.exported_at)

    @responses.activate
    def test_update_saml_service(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        xml = read_file("test/saml2/sp_meta_data.xml")
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            res_mock.add(responses.GET, service.saml_metadata_url, body=xml, status=200, content_type="text/xml")

            manage_base_url = self._resolve_manage_base_url()
            url = f"{manage_base_url}/manage/api/internal/metadata"
            external_identifier = str(uuid.uuid4())
            #  This will result in a PUT
            service.export_external_identifier = external_identifier
            res_mock.add(responses.PUT, url, json={"id": external_identifier, "version": 9}, status=200)
            updated_service = sync_external_service(self.app, service)

            self.assertEqual(external_identifier, updated_service.export_external_identifier)
            self.assertEqual(9, updated_service.export_external_version)
            self.assertTrue(updated_service.export_successful)
            self.assertTrue(updated_service.saml_metadata.startswith("<?xml"))

    def test_save_service_not_applies(self):
        res = sync_external_service(self.app, Service())
        self.assertIsNone(res)

    def test_save_service_manage_disabled(self):
        try:
            self.app.app_config.manage.enabled = False
            res = sync_external_service(self.app, Service())
            self.assertIsNone(res)
        finally:
            self.app.app_config.manage.enabled = True

    @responses.activate
    def test_delete_saml_service(self):
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self._resolve_manage_base_url()
            external_identifier = str(uuid.uuid4())
            url = f"{manage_base_url}/manage/api/internal/metadata/sram/{external_identifier}"
            res_mock.add(responses.DELETE, url, json={}, status=201)
            response_code = delete_external_service(self.app, external_identifier)
            self.assertEqual(201, response_code)

    @responses.activate
    def test_delete_saml_service_404(self):
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self._resolve_manage_base_url()
            external_identifier = str(uuid.uuid4())
            url = f"{manage_base_url}/manage/api/internal/metadata/sram/{external_identifier}"
            res_mock.add(responses.DELETE, url, json={"message": "NotFound"}, status=404)
            response_code = delete_external_service(self.app, external_identifier)
            self.assertEqual(404, response_code)

    def test_delete_saml_service_no_connection(self):
        response_code = delete_external_service(self.app, str(uuid.uuid4()))
        self.assertEqual(500, response_code)

    def test_delete_saml_service_manage_disabled(self):
        try:
            self.app.app_config.manage.enabled = False
            response_code = delete_external_service(self.app, str(uuid.uuid4()))
            self.assertIsNone(response_code)
        finally:
            self.app.app_config.manage.enabled = True

    @responses.activate
    def test_save_oidc_service_manage_no_changes(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        self.login("urn:john")
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self._resolve_manage_base_url()
            url = f"{manage_base_url}/manage/api/internal/metadata"
            res_mock.add(responses.POST, url, json={"validations": "No data is changed"}, status=400)
            updated_service = sync_external_service(self.app, service)

            self.assertIsNone(updated_service.export_external_version)
            self.assertTrue(updated_service.export_successful)
            self.assertIsNotNone(updated_service.exported_at)
