# -*- coding: future_fstrings -*-

from server.cron.idp_metadata_parser import idp_display_name
from server.test.abstract_test import AbstractTest


class TestIdpMetadataParser(AbstractTest):

    def test_schedule(self):
        display_name_nl = idp_display_name("https://signon.rug.nl/nidp/saml2/metadata", "nl")
        self.assertEqual("Rijksuniversiteit Groningen", display_name_nl)

        display_name_en = idp_display_name("https://signon.rug.nl/nidp/saml2/metadata", "en")
        self.assertEqual("University of Groningen", display_name_en)

        display_name_pt = idp_display_name("https://signon.rug.nl/nidp/saml2/metadata", "pt")
        self.assertEqual("University of Groningen", display_name_pt)

        display_none = idp_display_name("nope")
        self.assertEqual("nope", display_none)
