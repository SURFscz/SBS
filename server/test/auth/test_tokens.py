from sqlalchemy import text
from werkzeug.exceptions import BadRequest


from server.auth.tokens import _service_context
from server.db.db import db
from server.db.domain import Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_cloud_name


class TestTokens(AbstractTest):

    def test_token_invalid_context(self):
        # unset the scim url directly in the database; this should invalidate the scim token
        service = self.find_entity_by_name(Service, service_cloud_name)
        db.session.execute(text(f"UPDATE services SET scim_url=NULL WHERE id = {service.id}"))
        db.session.commit()

        with self.assertRaises(BadRequest) as cm:
            _service_context(service)
        self.assertIn("scim_url and id need to be set for service to encrypt secret", str(cm.exception))
