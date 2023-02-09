import tempfile
from unittest import TestCase

from server.tools import read_file


class TestTools(TestCase):

    def test_read_file(self):
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name + ".txt"

        f = open(path, "w")
        f.write("test")
        f.close()

        self.assertEqual("test", read_file(path))
