# -*- coding: future_fstrings -*-

from server.db.domain import Service, Organisation
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_wiki_name, uuc_name, service_wireless_name, \
    service_ssh_uva_name, service_mail_name, service_group_mail_name


class TestOrganisationsServices(AbstractTest):

    def _do_add_organisations_services(self, organisation_name, service_name, response_status_code=201,
                                       user="urn:john"):
        self.login(user)
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

    def test_add_organisations_services_restricted(self):
        self.mark_organisation_service_restricted(self.find_entity_by_name(Organisation, uuc_name).id)
        self._do_add_organisations_services(uuc_name, service_wireless_name, response_status_code=403, user="urn:mary")

    def test_add_organisations_services_not_allowed_organisation(self):
        res = self._do_add_organisations_services(uuc_name, service_ssh_uva_name, response_status_code=400)
        self.assertTrue("not_allowed_organisation" in res["message"])

    def test_add_organisations_services_no_automatic_connection_allowed(self):
        res = self._do_add_organisations_services(uuc_name, service_wiki_name, response_status_code=400)
        self.assertTrue("automatic_connection_not_allowed" in res["message"])

    def test_add_organisations_services_with_service_groups(self):
        self._do_add_organisations_services(uuc_name, service_mail_name)
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        self.assertEqual(3, len(organisation.services))
        # We need to assert that for every collaboration in the organisation a (service) group was added: mail_mail
        for collaboration in organisation.collaborations:
            group = list(filter(lambda item: item.name == service_group_mail_name, collaboration.groups))[0]
            self.assertEqual("mail-mail", group.short_name)

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

    def test_delete_organisations_services_restricted(self):
        uuc = self.find_entity_by_name(Organisation, uuc_name)
        uuc_id = uuc.id
        services_id = uuc.services[0].id

        self.mark_organisation_service_restricted(uuc_id)

        self.login("urn:mary")
        self.delete(f"api/organisations_services/{uuc_id}/{services_id}",
                    with_basic_auth=False,
                    response_status_code=403)
