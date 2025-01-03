import tempfile
from unittest import TestCase

from server.tools import read_file, inactivity, YEAR, WEEK, MONTH


class TestTools(TestCase):

    def test_read_file(self):
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name + ".txt"

        f = open(path, "w")
        f.write("test")
        f.close()

        self.assertEqual("test", read_file(path))

    def test_inactivity(self):
        res = inactivity(YEAR + 5)
        self.assertEqual(365, res)
        res = inactivity(YEAR - 5)
        self.assertEqual(360, res)
        res = inactivity(MONTH + 5)
        self.assertEqual(30, res)
        res = inactivity(MONTH - 5)
        self.assertEqual(21, res)
        res = inactivity(WEEK + 8)
        self.assertEqual(14, res)
        res = inactivity(WEEK + 2)
        self.assertEqual(7, res)
        res = inactivity(WEEK - 2)
        self.assertEqual(1, res)
