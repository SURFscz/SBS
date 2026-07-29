from unittest import TestCase

from server.scim.schema_template import schema_sram_user_template


class TestSchemaTemplate(TestCase):

    def test_schema_sram_user_includes_policy_agreement_attributes(self):
        schema = schema_sram_user_template()
        policy_agreement = next(
            attribute for attribute in schema["attributes"] if attribute["name"] == "voPersonPolicyAgreement"
        )

        self.assertEqual("complex", policy_agreement["type"])
        self.assertTrue(policy_agreement["multiValued"])
        sub_attribute_names = {sub_attribute["name"] for sub_attribute in policy_agreement["subAttributes"]}
        self.assertEqual({"url", "service_id", "agreed_at"}, sub_attribute_names)
