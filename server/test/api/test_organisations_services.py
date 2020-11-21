# -*- coding: future_fstrings -*-

from server.db.domain import Service, Organisation
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_wiki_name, uuc_name, service_wireless_name, \
    service_ssh_uva_name


class TestOrganisationsServices(AbstractTest):

    def _do_add_organisations_services(self, organisation_name, service_name, response_status_code=201):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, organisation_name).id
        service_id = self.find_entity_by_name(Service, service_name).id
        return self.put("/api/organisations_services/", body={
            "organisation_id": organisation_id,
            "service_id": service_id
        }, response_status_code=response_status_code)

    def test_add_organisations_services(self):
        self._do_add_organisations_services(uuc_name, service_wireless_name)
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(3, len(organisation.services))

    def test_add_organisations_services_not_allowed_organisation(self):
        res = self._do_add_organisations_services(uuc_name, service_ssh_uva_name, response_status_code=400)
        self.assertEqual("not_allowed_organisation", res["message"])

    def test_add_organisations_services_no_automatic_connection_allowed(self):
        res = self._do_add_organisations_services(uuc_name, service_wiki_name, response_status_code=400)
        self.assertEqual("automatic_connection_not_allowed", res["message"])

    def test_delete_organisations_services(self):
        uuc = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(2, len(uuc.services))
        organisation_id = uuc.id
        service_id = uuc.services[0].id
        response = self.client.delete(f"api/organisations_services/{organisation_id}/{service_id}",
                                      headers=BASIC_AUTH_HEADER,
                                      content_type="application/json")
        self.assertEqual(204, response.status_code)
        uuc = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(1, len(uuc.services))
