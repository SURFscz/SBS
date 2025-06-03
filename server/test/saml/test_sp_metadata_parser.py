from unittest import TestCase
import responses
from server.saml.sp_metadata_parser import parse_metadata_xml, parse_metadata_url
from server.tools import read_file

expected_dict = {"entity_id": "https://engine.test.surfconext.nl/authentication/sp/metadata",
                 "acs_locations": [
                     {"location": "https://engine.test.surfconext.nl/authentication/sp/consume-assertion",
                      "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"},
                     {"location": "https://engine.test.surfconext.nl/acs-location/1",
                      "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"}
                 ],
                 "organization_name": "SURFconext TEST EN"}


class TestSPMetaDataParser(TestCase):

    def test_parse_metadata(self):
        xml = read_file("test/saml2/sp_meta_data.xml")
        meta_data = parse_metadata_xml(xml)
        self.assertDictEqual(meta_data, expected_dict)

    @responses.activate
    def test_parse_metadata_url(self):
        xml = read_file("test/saml2/sp_meta_data.xml")
        url = "http://localhost:8099/sp/metadata"
        responses.add(responses.GET, url, body=xml, status=200, content_type="text/xml")
        meta_data = parse_metadata_url(url)
        self.assertDictEqual(meta_data, expected_dict)
