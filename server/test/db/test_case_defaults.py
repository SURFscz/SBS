from unittest import TestCase

from server.db.defaults import split_user_affiliations
from server.db.domain import User


class TestCaseDefaults(TestCase):

    def test_split_list_semantically(self):
        user = User()
        user.affiliation = "aff1, aff2, aff3"
        user.scoped_affiliation = "scoped_aff1, scoped_aff2"
        user_affiliations = split_user_affiliations(user)
        self.assertEqual("aff1, aff2, aff3, scoped_aff1 and scoped_aff2", user_affiliations)

    def test_split_list_semantically_none(self):
        user = User()
        user_affiliations = split_user_affiliations(user)
        self.assertEqual("", user_affiliations)

    def test_split_list_semantically_empty(self):
        user = User()
        user.affiliation = "aff1, aff2, aff3"
        user.scoped_affiliation = ""
        user_affiliations = split_user_affiliations(user)
        self.assertEqual("aff1, aff2 and aff3", user_affiliations)
