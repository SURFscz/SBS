from unittest import TestCase

from werkzeug.exceptions import BadRequest

from server.scim.pagination import parse_pagination_params, paginate_items


class TestScimPagination(TestCase):

    def test_defaults(self):
        start_index, count = parse_pagination_params(None, None)
        self.assertEqual(1, start_index)
        self.assertIsNone(count)

    def test_parses_query_params(self):
        start_index, count = parse_pagination_params("3", "2")
        self.assertEqual(3, start_index)
        self.assertEqual(2, count)

    def test_rejects_invalid_start_index(self):
        with self.assertRaises(BadRequest):
            parse_pagination_params("0", None)
        with self.assertRaises(BadRequest):
            parse_pagination_params("nope", None)

    def test_rejects_invalid_count(self):
        with self.assertRaises(BadRequest):
            parse_pagination_params(None, "-1")
        with self.assertRaises(BadRequest):
            parse_pagination_params(None, "nope")

    def test_paginate_items(self):
        items = ["a", "b", "c", "d", "e"]

        page, total, items_per_page = paginate_items(items, 1, 2)
        self.assertEqual(["a", "b"], page)
        self.assertEqual(5, total)
        self.assertEqual(2, items_per_page)

        page, total, items_per_page = paginate_items(items, 3, 2)
        self.assertEqual(["c", "d"], page)
        self.assertEqual(5, total)
        self.assertEqual(2, items_per_page)

        page, total, items_per_page = paginate_items(items, 6, 2)
        self.assertEqual([], page)
        self.assertEqual(5, total)
        self.assertEqual(0, items_per_page)

        page, total, items_per_page = paginate_items(items, 1, None)
        self.assertEqual(items, page)
        self.assertEqual(5, total)
        self.assertEqual(5, items_per_page)

        page, total, items_per_page = paginate_items(items, 1, 0)
        self.assertEqual([], page)
        self.assertEqual(5, total)
        self.assertEqual(0, items_per_page)
