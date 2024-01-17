
from server.cron.idp_metadata_parser import idp_display_name, idp_schac_home_by_entity_id, parse_idp_metadata
from server.test.abstract_test import AbstractTest
from server.cron import idp_metadata_parser


class TestIdpMetadataParser(AbstractTest):

    def test_idp_displayname(self):
        idp_metadata_parser.idp_metadata = None

        display_name_nl = idp_display_name("uni-franeker.nl", "nl")
        self.assertEqual("Universiteit van Franeker", display_name_nl)

        display_name_en = idp_display_name("uni-franeker.nl", "en")
        self.assertEqual("Academy of Franeker", display_name_en)

        display_name_pt = idp_display_name("uni-franeker.nl", "qq")
        self.assertEqual("Academy of Franeker", display_name_pt)

        display_none = idp_display_name("nope")
        self.assertEqual("nope", display_none)

        display_none = idp_display_name("nope", lang="en", use_default=False)
        self.assertIsNone(display_none)

    def test_idp_schachome(self):
        idp_metadata_parser.idp_metadata = None

        schac_home = idp_schac_home_by_entity_id("https://idp.uni-franeker.nl/")
        self.assertEqual("uni-franeker.nl", schac_home)

        schac_home = idp_schac_home_by_entity_id("nope")
        self.assertIsNone(schac_home)

        schac_home = idp_schac_home_by_entity_id(None)
        self.assertIsNone(schac_home)

    def test_idp_metadata(self):
        idp_metadata_parser.idp_metadata = None
        parse_idp_metadata(self.app)

        self.assertEqual(len(idp_metadata_parser.idp_metadata["schac_home_organizations"]), 4)
        self.assertEqual(len(idp_metadata_parser.idp_metadata["entity_ids"]), 2)
