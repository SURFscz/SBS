from unittest import TestCase

from server.scim.schema_template import schema_sram_group_template


class TestSchemaTemplate(TestCase):

    def test_schema_sram_group_includes_links_attributes(self):
        schema = schema_sram_group_template()
        links = next(attribute for attribute in schema["attributes"] if attribute["name"] == "links")

        self.assertEqual("complex", links["type"])
        self.assertTrue(links["multiValued"])
        sub_attribute_names = {sub_attribute["name"] for sub_attribute in links["subAttributes"]}
        self.assertEqual({"name", "value"}, sub_attribute_names)
