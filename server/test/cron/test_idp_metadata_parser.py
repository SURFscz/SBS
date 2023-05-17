
from server.cron.idp_metadata_parser import idp_display_name, idp_schac_home_by_entity_id
from server.test.abstract_test import AbstractTest


class TestIdpMetadataParser(AbstractTest):

    def test_schedule(self):
        display_name_nl = idp_display_name("rug.nl", "nl")
        self.assertEqual("Rijksuniversiteit Groningen", display_name_nl)

        display_name_en = idp_display_name("rug.nl", "en")
        self.assertEqual("University of Groningen", display_name_en)

        display_name_pt = idp_display_name("rug.nl", "qq")
        self.assertEqual("University of Groningen", display_name_pt)

        display_none = idp_display_name("nope")
        self.assertEqual("nope", display_none)

        display_none = idp_display_name("nope", lang="en", use_default=False)
        self.assertIsNone(display_none)

        schac_home = idp_schac_home_by_entity_id("https://signon.rug.nl/nidp/saml2/metadata")
        self.assertEqual("rug.nl", schac_home)

        schac_home = idp_schac_home_by_entity_id("nope")
        self.assertIsNone(schac_home)

        schac_home = idp_schac_home_by_entity_id(None)
        self.assertIsNone(schac_home)

        from server.cron.idp_metadata_parser import idp_metadata
        self.assertTrue(len(idp_metadata["schac_home_organizations"]) > 300)
        self.assertTrue(len(idp_metadata["entity_ids"]) > 200)
