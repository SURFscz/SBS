import os

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from server.cron import idp_metadata_parser
from server.cron.idp_metadata_parser import idp_display_name, parse_idp_metadata, \
    idp_metadata_file
from server.test.abstract_test import AbstractTest


class TestIdpMetadataParser(AbstractTest):

    def test_idp_displayname(self):
        if os.path.isfile(idp_metadata_file):
            os.remove(idp_metadata_file)

        idp_metadata_parser.idp_metadata = None

        display_name_nl = idp_display_name("uni-franeker.nl", "nl")
        self.assertEqual("Universiteit van Franeker", display_name_nl)

        idp_metadata_parser.idp_metadata = None

        display_name_en = idp_display_name("uni-franeker.nl", "en")
        self.assertEqual("Academy of Franeker", display_name_en)

        display_name_qq = idp_display_name("uni-franeker.nl", "qq")
        self.assertEqual("Academy of Franeker", display_name_qq)

        display_none = idp_display_name("nope")
        self.assertEqual("nope", display_none)

        display_none = idp_display_name("nope", lang="en", use_default=False)
        self.assertIsNone(display_none)

    def test_idp_metadata(self):
        idp_metadata_parser.idp_metadata = None
        parse_idp_metadata(self.app)

        self.assertEqual(len(idp_metadata_parser.idp_metadata["schac_home_organizations"]), 5)
        self.assertEqual(len(idp_metadata_parser.idp_metadata["reg_exp_schac_home_organizations"]), 1)

        idp_metadata_parser.idp_metadata = None
        # Use the cache
        display_name_nl = idp_display_name("uni-franeker.nl", "nl")
        self.assertEqual("Universiteit van Franeker", display_name_nl)
        with self.app.app_context():
            session = sessionmaker(self.app.db.engine)()
            lock_name = idp_metadata_parser.idp_metadata_lock_name
            try:
                # Insert a lock to simulate another instance holding it
                session.execute(
                    text("INSERT INTO distributed_locks (lock_name, acquired_at) VALUES (:lock_name, NOW())"),
                    {"lock_name": lock_name}
                )
                session.commit()
                
                # Now we have the lock, and we assert the idp_metadata_parser.idp_metadata is reset
                result = parse_idp_metadata(self.app)
                self.assertIsNone(result)
                self.assertIsNone(idp_metadata_parser.idp_metadata)

                display_name_nl = idp_display_name("uni-franeker.nl", "nl")
                self.assertEqual("Universiteit van Franeker", display_name_nl)
            finally:
                session.execute(
                    text("DELETE FROM distributed_locks WHERE lock_name = :lock_name"),
                    {"lock_name": lock_name}
                )
                session.commit()
                session.close()

    def test_idp_display_name_wildcard(self):
        if os.path.isfile(idp_metadata_file):
            os.remove(idp_metadata_file)

        display_name_en = idp_display_name("test.knaw.nl", "nl")
        self.assertEqual("Koninklijke Nederlandse Akademie van Wetenschappen (NL)", display_name_en)

    def test_idp_display_name_config_override(self):
        display_name = idp_display_name("test.nl")
        self.assertEqual("Koninklijke Nederlandse Test", display_name)
