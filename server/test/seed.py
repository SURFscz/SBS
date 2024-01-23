import base64
import datetime
import os
import uuid

from sqlalchemy import text

from server.api.collaboration_request import STATUS_OPEN
from server.auth.secrets import secure_hash, generate_token
from server.db.audit_mixin import metadata
from server.db.defaults import default_expiry_date, SERVICE_TOKEN_INTROSPECTION, SERVICE_TOKEN_SCIM, SERVICE_TOKEN_PAM
from server.db.domain import (User, Organisation, OrganisationMembership, Service, Collaboration,
                              CollaborationMembership, JoinRequest, Invitation, Group, OrganisationInvitation, ApiKey,
                              CollaborationRequest, ServiceConnectionRequest, SuspendNotification, Aup,
                              SchacHomeOrganisation, SshKey, ServiceGroup, ServiceInvitation, ServiceMembership,
                              ServiceAup, UserToken, UserIpNetwork, Tag, PamSSOSession, IpNetwork, ServiceToken,
                              ServiceRequest, Unit)
from server.tools import dt_now, dt_today

# users
user_boss_name = "The Boss"
user_roger_name = "Roger Doe"
user_john_name = "John Doe"
user_mike_name = "Mike Doe"
user_james_name = "James Byrd"
user_sarah_name = "Sarah Cross"
user_jane_name = "Jane Doe"

user_sarah_user_token_network = generate_token()
user_betty_user_token_wiki = generate_token()

# schac_home_organisations
schac_home_organisation_example = "example.org"
schac_home_organisation_unihar = "uni-harderwijk.nl"

# organisations
unihard_name = "Universiteit van Harderwijk"
unihard_short_name = "uniharderwijk"
unihard_secret = generate_token()
unihard_hashed_secret = secure_hash(unihard_secret)
unihard_unit_research_name = "Research"
unihard_unit_support_name = "Support"
unihard_invitation_hash = generate_token()  # uuc
unihard_invitation_expired_hash = generate_token()  # uuc

unifra_name = "Academia Franekerensis"
unifra_secret = generate_token()
unifra_hashed_secret = secure_hash(unifra_secret)

umcpekela_name = "Universitair Medisch Centrum Noord-Pekela"

# collaborations
co_ai_computing_name = "AI computing"
co_ai_computing_short_name = "ai_computing"
co_ai_computing_uuid = "a71a2b01-4642-4e1a-b3ac-0a06b2bf66f2"
co_ai_computing_join_request_peter_hash = generate_token()
co_ai_computing_join_request_john_reference = "Dr. Johnson"

co_teachers_name = "Teachers"

co_research_name = "Research"
co_research_uuid = "da706611-0afb-4a7a-819b-b0a9c63e9b67"

co_monitoring_name = "Monitoring CO numero 1"

co_robotics_disabled_join_request_name = "Robotics"

collaboration_request_name = "New Collaboration"

# groups
group_ai_researchers = "AI researchers"
group_ai_researchers_short_name = "ai_res"
group_ai_researchers_identifier = "9734e4c4-d23e-4228-b0e0-8e6a5b85e72e"
group_ai_dev_identifier = "4c270cff-de30-49e8-a3bc-df032536b37c"
group_science_name = "Science"
group_science_identifier = "e46e388c-9362-4aaa-b23f-a855bf559598"

# services
service_mail_name = "Mail Services"
service_mail_entity_id = "https://mail"

service_network_name = "Network Services"
service_network_entity_id = "https://network"
service_wiki_entity_id = "https://wiki"
service_storage_entity_id = "https://storage"
service_cloud_entity_id = "https://cloud"
service_scheduler_entity_id = "uuc_scheduler_entity_id"

service_storage_name = "Storage"
service_wireless_name = "Wireless"
service_cloud_name = "Cloud"
service_wiki_name = "Wiki"
service_ssh_name = "SSH Service"
service_scheduler_name = "Scheduler Service"
service_sram_demo_sp = "SRAM Demo RP"

service_group_mail_name = "service_group_mail_name"
service_group_wiki_name1 = "service_group_wiki_name_1"
service_group_wiki_name2 = "service_group_wiki_name_2"

service_connection_request_network_hash = generate_token()
service_connection_request_ssh_hash = generate_token()
service_connection_request_wireless_hash = generate_token()

service_request_gpt_name = "GPT"

service_invitation_cloud_hash = generate_token()
service_invitation_wiki_expired_hash = generate_token()

# tokens
invitation_hash_curious = generate_token()
invitation_hash_no_way = generate_token()
invitation_hash_uva = generate_token()

service_cloud_token = generate_token()
service_network_token = generate_token()
service_storage_token = generate_token()
service_wiki_token = generate_token()

# pam
pam_session_id = str(uuid.uuid4())
pam_invalid_service_session_id = str(uuid.uuid4())

image_cache = {}


def read_image(file_name, directory="images"):
    file = f"{os.path.dirname(os.path.realpath(__file__))}/{directory}/{file_name}"
    global image_cache
    if file in image_cache:
        return image_cache.get(file)
    with open(file, "rb") as f:
        c = f.read()
        decoded = base64.encodebytes(c).decode("utf-8")
        image_cache[file] = decoded
        return decoded


def persist_instance(db, *objs):
    required_attrs = ["created_by", "updated_by"]
    for obj in objs:
        for attr in required_attrs:
            if hasattr(obj, attr) and not getattr(obj, attr):
                setattr(obj, attr, "urn:admin")
        if isinstance(obj, User):
            aup = Aup(au_version="1", user=obj)
            if not getattr(obj, "external_id"):
                setattr(obj, "external_id", str(uuid.uuid4()))
            db.session.add(aup)
        db.session.add(obj)


def clean_db(db):
    tables = reversed(metadata.sorted_tables)
    # tables = reversed(metadata.sort_tables_and_constraints)
    for table in tables:
        db.session.execute(table.delete())
    db.session.execute(text("DELETE FROM audit_logs"))
    db.session.commit()


def seed(db, app_config, skip_seed=False):
    clean_db(db)

    if skip_seed:
        return

    john = User(uid="urn:john", name=user_john_name, email="john@example.org", username="john",
                address="Postal 1234AA", external_id="86eee601-770f-4df3-bd4c-181a2edcbb2f")
    peter = User(uid="urn:peter", name="Peter Doe", email="peter@example.org", username="peter",
                 external_id="b7fdbc01-5b5a-4028-b90a-5409f380e603")
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org", username="mdoe",
                schac_home_organisation=schac_home_organisation_example, external_id="bb3d4bd4-2848-4cf3-b30b-fd84186c0c52")
    admin = User(uid="urn:admin", name=user_boss_name, email="boss@example.org", username="admin",
                 external_id="e906cf88-cdb3-480d-8bb3-ce53bdcda4e7")
    roger = User(uid="urn:roger", name=user_roger_name, email="roger@example.org",
                 schac_home_organisation=schac_home_organisation_example, username="roger",
                 external_id="c601d601-4a54-498a-9c45-f98882050733")
    harry = User(uid="urn:harry", name="Harry Doe", email="harry@example.org", username="harry",
                 external_id="91322eb8-1c26-4b85-90d0-39079ef47694")
    james = User(uid="urn:james", name=user_james_name, email="james@example.org", username="james",
                 schac_home_organisation=schac_home_organisation_unihar, given_name="James",
                 external_id="100ae6f1-930f-459c-bf1a-f28facfe5834")
    sarah = User(uid="urn:sarah", name=user_sarah_name, email="sarah@uni-franeker.nl", application_uid="sarah_application_uid",
                 username="sarah", external_id="8297d8a5-a2a4-4208-9fb6-100a5865f022")
    betty = User(uid="urn:betty", name="betty", email="betty@uuc.org", username="betty",
                 external_id="bbd8123c-b0f9-4e3d-b3ff-288aa1c1edd6", mfa_reset_token="1234567890")
    jane = User(uid="urn:jane", name=user_jane_name, email="jane@ucc.org", username="jane",
                entitlement="urn:mace:surf.nl:sram:allow-create-co", external_id="502e861e-f548-4335-89d8-f1764f803964")
    paul = User(uid="urn:paul", name="Paul Doe", email="paul@ucc.org", username="paul",
                schac_home_organisation="example.org", external_id="0cb73fdf-3fe1-4e99-afe1-597d6226d030")
    hannibal = User(uid="urn:hannibal", name=None, email="hannibal@example.org", username="hlector",
                    schac_home_organisation="example.org", external_id="9527f225-d8d1-4410-8c2e-ed2548db908d")
    service_admin = User(uid="urn:service_admin", name="Service Admin", email="service_admin@ucc.org",
                         username="service_admin", schac_home_organisation="service.admin.com",
                         external_id="c5ed5e18-b6aa-48f2-8849-a68a8cfe39a8")
    # User seed for suspend testing
    retention = app_config.retention
    current_time = dt_now()
    retention_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days + 1)
    retention_warning_date = retention_date + datetime.timedelta(days=retention.reminder_suspend_period_days)

    user_suspend_warning = User(uid="urn:user_suspend_warning", name="user_suspend_warning",
                                email="user_suspend_warning@example.org", username="user_suspend_warning",
                                last_login_date=retention_warning_date, last_accessed_date=retention_warning_date,
                                schac_home_organisation="not.exists")
    user_gets_suspended = User(uid="urn:user_gets_suspended", name="user_gets_suspended",
                               email="user_gets_suspended@example.org", username="1suspend",
                               last_login_date=retention_date, last_accessed_date=retention_date)

    deletion_date = retention_date - datetime.timedelta(days=retention.remove_suspended_users_period_days)
    deletion_warning_date = deletion_date + datetime.timedelta(days=retention.reminder_expiry_period_days)

    user_deletion_warning = User(uid="urn:user_deletion_warning", name="user_deletion_warning",
                                 email="user_deletion_warning@example.org", username="user_deletion_warning",
                                 suspended=True, last_login_date=deletion_warning_date,
                                 last_accessed_date=deletion_warning_date)

    user_gets_deleted = User(uid="urn:user_gets_deleted", name="user_gets_deleted",
                             email="user_gets_deleted@example.org", username="user_gets_deleted",
                             last_login_date=deletion_date, last_accessed_date=deletion_date,
                             suspended=True)

    persist_instance(db, john, mary, peter, admin, roger, harry, james, sarah, betty, jane,
                     user_suspend_warning, user_gets_suspended, user_deletion_warning, user_gets_deleted,
                     paul, hannibal, service_admin)

    # old suspension warning, should not affect new suspension warnings
    warning_date_old = current_time - datetime.timedelta(retention.allowed_inactive_period_days + 1)
    notification_gets_suspended_old = SuspendNotification(user=user_suspend_warning, sent_at=warning_date_old,
                                                          is_suspension=True, is_warning=True)

    warning_date = dt_now() - datetime.timedelta(days=retention.reminder_suspend_period_days + 1)
    notification_gets_suspended = SuspendNotification(user=user_gets_suspended, sent_at=warning_date,
                                                      is_suspension=True, is_warning=True)

    warning_date = dt_now() - datetime.timedelta(days=retention.remove_suspended_users_period_days) \
                   + datetime.timedelta(days=retention.reminder_expiry_period_days - 1)
    notification_suspension_warning = SuspendNotification(user=user_deletion_warning, sent_at=warning_date,
                                                          is_suspension=True, is_warning=False)

    deletion_date = current_time - datetime.timedelta(retention.remove_suspended_users_period_days + 1)
    notification_gets_deleted = SuspendNotification(user=user_gets_deleted, sent_at=deletion_date,
                                                    is_suspension=False, is_warning=True)

    persist_instance(db, notification_gets_suspended_old, notification_gets_suspended,
                     notification_suspension_warning, notification_gets_deleted)

    ssh_key_john = SshKey(user=john, ssh_value="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                                               "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                                               "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                                               "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                                               "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                                               "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                                               "jxEpu8soL okke@Mikes-MBP-2.fritz.box")
    ssh_key_james = SshKey(user=james, ssh_value="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                                                 "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                                                 "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                                                 "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                                                 "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                                                 "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                                                 "jxEpu8soL okke@Mikes-MBP-2.fritz.box")
    ssh_key_sarah = SshKey(user=sarah, ssh_value="some-lame-key")
    persist_instance(db, ssh_key_john, ssh_key_james, ssh_key_sarah)

    sarah_user_ip_network = UserIpNetwork(network_value="255.0.0.1/32", user=sarah)
    sarah_other_user_ip_network = UserIpNetwork(network_value="255.0.0.9/24", user=sarah)
    persist_instance(db, sarah_user_ip_network, sarah_other_user_ip_network)

    uuc = Organisation(name=unihard_name, short_name=unihard_short_name, identifier="95306a5f-0a16-4461-b358-8442e09dab20",
                       description="Unincorporated Urban Community", logo=read_image("uni-harderwijk.png"),
                       created_by="urn:admin", updated_by="urnadmin", category="Research",
                       accepted_user_policy="https://uni-harderwijk/aup/v1",
                       on_boarding_msg="We are using **SRAM** to provide access to the following research tools:"
                                       "\n- Wiki\n- Cloud\n- Awesome things...\n\nIf you want to join one of our "
                                       "collaborations, please send a mail to [support@uuc.nl](mailto:support@uuc.nl)."
                                       "\n<br/><br/>\nHappy researching,\n\n*UUC support*",
                       collaboration_creation_allowed=True)
    uva = Organisation(name=unifra_name, description=unifra_name,
                       identifier="7c60a022-ab09-438c-8603-c361bc1a088d", created_by="urn:admin",
                       updated_by="urn:admin", short_name="ufra", logo=read_image("uni-franeker.png"),
                       category="University", service_connection_requires_approval=True,
                       accepted_user_policy="https://uni-franeker/aup/v1",)
    tue = Organisation(name=umcpekela_name, description=umcpekela_name,
                       identifier="65fadfcb-71fd-4962-8428-0ecd15970f8d",
                       created_by="urn:admin", updated_by="urn:admin", short_name="tue",
                       logo=read_image("umc-pekela.png"), category="UMC")
    persist_instance(db, uuc, uva, tue)

    uuc_unit_research = Unit(name=unihard_unit_research_name, organisation=uuc)
    uuc_unit_support = Unit(name=unihard_unit_support_name, organisation=uuc)
    persist_instance(db, uuc_unit_research, uuc_unit_support)

    shouuc = SchacHomeOrganisation(name=schac_home_organisation_unihar, organisation=uuc, created_by="urn:admin",
                                   updated_by="urn:admin")
    shouva = SchacHomeOrganisation(name=schac_home_organisation_example, organisation=uva, created_by="urn:admin",
                                   updated_by="urn:admin")
    persist_instance(db, shouuc, shouva)

    api_key_uuc = ApiKey(hashed_secret=unihard_hashed_secret, organisation=uuc, description="API access",
                         created_by="urn:admin", updated_by="urn:admin")
    api_key_uva = ApiKey(hashed_secret=unifra_hashed_secret, organisation=uva, description="API access",
                         created_by="urn:admin", updated_by="urn:admin")
    persist_instance(db, api_key_uuc, api_key_uva)

    organisation_invitation_roger = OrganisationInvitation(message="Please join", hash=unihard_invitation_hash,
                                                           expiry_date=dt_today() + datetime.timedelta(days=14),
                                                           invitee_email="roger@example.org", organisation=uuc,
                                                           units=[uuc_unit_research],
                                                           intended_role="admin",
                                                           user=john)
    organisation_invitation_pass = OrganisationInvitation(message="Let me please join as I "
                                                                  "really, really, really \n really, "
                                                                  "really, really \n want to...",
                                                          hash=unihard_invitation_expired_hash,
                                                          expiry_date=dt_today() - datetime.timedelta(days=21),
                                                          intended_role="admin",
                                                          invitee_email="pass@example.org", organisation=uuc, user=john)
    persist_instance(db, organisation_invitation_roger, organisation_invitation_pass)

    organisation_membership_john = OrganisationMembership(role="admin", user=john, organisation=uuc)
    organisation_membership_mary = OrganisationMembership(role="admin", user=mary, organisation=uuc)
    organisation_membership_harry = OrganisationMembership(role="manager", user=harry, organisation=uuc,
                                                           units=[uuc_unit_support])
    organisation_membership_jane = OrganisationMembership(role="admin", user=jane, organisation=uva)
    organisation_membership_paul_uuc = OrganisationMembership(role="manager", user=paul, organisation=uuc,
                                                              units=[uuc_unit_research])
    organisation_membership_paul_uva = OrganisationMembership(role="manager", user=paul, organisation=uva)
    persist_instance(db, organisation_membership_john, organisation_membership_mary, organisation_membership_harry,
                     organisation_membership_jane, organisation_membership_paul_uuc, organisation_membership_paul_uva)

    mail = Service(entity_id=service_mail_entity_id, name=service_mail_name, contact_email=john.email,
                   override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                   logo=read_image("email.png"),
                   accepted_user_policy="https://google.nl", allowed_organisations=[uuc, uva], abbreviation="mail",
                   privacy_policy="https://privacy.org", security_email="sec@org.nl")
    wireless = Service(entity_id="https://wireless", name=service_wireless_name, description="Network Wireless Service",
                       override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                       contact_email=john.email,
                       logo=read_image("wireless.png"), accepted_user_policy="https://google.nl", abbreviation="wire",
                       allowed_organisations=[uuc, uva], uri="https://wireless", non_member_users_access_allowed=True,
                       privacy_policy="https://privacy.org", security_email="sec@org.nl")
    # ldap_password is 'changethispassword'
    cloud = Service(entity_id=service_cloud_entity_id, name=service_cloud_name, description="SARA Cloud Service",
                    override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                    logo=read_image("cloud.png"),
                    allowed_organisations=[uuc, uva], abbreviation="cloud",
                    token_enabled=True, token_validity_days=1, security_email="sec@org.nl", scim_client_enabled=True,
                    scim_enabled=True, scim_url="http://localhost:8080/api/scim_mock", scim_bearer_token="secret")
    storage = Service(entity_id=service_storage_entity_id, name=service_storage_name, allowed_organisations=[uuc, uva],
                      description="SURF Storage Service", logo=read_image("storage.png"), abbreviation="storage",
                      override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                      allow_restricted_orgs=True,
                      uri="https://storage.net", support_email="support@storage.net",
                      pam_web_sso_enabled=True, security_email="sec@org.nl",
                      accepted_user_policy="https://google.nl", privacy_policy="https://privacy.org",
                      scim_enabled=True, scim_url="http://localhost:8080/api/scim_mock", scim_bearer_token="secret")
    wiki = Service(entity_id=service_wiki_entity_id, name=service_wiki_name, description="No more wiki's please",
                   uri="https://servicedesk.surf.nl/wiki/",
                   override_access_allowed_all_connections=False, automatic_connection_allowed=False,
                   logo=read_image("wiki.png"),
                   allowed_organisations=[uuc, uva], contact_email="help@wiki.com", abbreviation="wiki",
                   accepted_user_policy="https://google.nl", privacy_policy="https://privacy.org",
                   automatic_connection_allowed_organisations=[uva], ldap_enabled=True,
                   ldap_password="$2b$12$GLjC5hK59aeDcEe.tHHJMO.SQQjFgIIpZ7VaKTIsBn05z/gE7JQny",
                   token_enabled=True, scim_client_enabled=True, token_validity_days=365, security_email="sec@org.nl")
    sweep_scim_last_run = current_time - datetime.timedelta(days=1)
    network = Service(entity_id=service_network_entity_id, name=service_network_name,
                      description="Network enabling service SSH access", address="Some address",
                      uri="https://uri.net", identity_type="SSH KEY", accepted_user_policy="https://aup.org",
                      logo=read_image("network.png"), automatic_connection_allowed=False, abbreviation="network",
                      allowed_organisations=[uuc], privacy_policy="https://privacy.org",
                      token_enabled=True, token_validity_days=365, security_email="sec@org.nl",
                      scim_enabled=True, scim_url="http://localhost:8080/api/scim_mock", scim_bearer_token="secret",
                      sweep_scim_last_run=sweep_scim_last_run, sweep_scim_daily_rate=1, sweep_scim_enabled=True,
                      sweep_remove_orphans=True, scim_client_enabled=True)
    service_ssh_uva = Service(entity_id="service_ssh_ufra", name=service_ssh_name,
                              description="Franeker SSH access",
                              uri="https://uri.com/ssh", identity_type="SSH KEY", accepted_user_policy="https://ssh",
                              contact_email="help@ssh.com", logo=read_image("ssh.png"),
                              automatic_connection_allowed=False,
                              access_allowed_for_all=True, abbreviation="service_ssh",
                              research_scholarship_compliant=True,
                              code_of_conduct_compliant=True, sirtfi_compliant=True,
                              privacy_policy="https://privacy.org", security_email="sec@org.nl")
    service_ssh_uva.ldap_identifier = service_ssh_uva.entity_id

    uuc_scheduler = Service(entity_id=service_scheduler_entity_id, name=service_scheduler_name,
                            accepted_user_policy="https://google.nl", abbreviation="uuc_scheduler",
                            description="UUC Scheduler Service", logo=read_image("scheduler.png"),
                            contact_email="help@uuc_scheduler.example.com",
                            automatic_connection_allowed_organisations=[uva],
                            override_access_allowed_all_connections=False, automatic_connection_allowed=False,
                            allowed_organisations=[uuc],
                            privacy_policy="https://privacy.org", security_email="sec@org.nl", ldap_enabled=False)

    demo_sp = Service(entity_id="https://demo-sp.sram.surf.nl/saml/module.php/saml/sp/metadata.php/test",
                      name="SRAM Demo SP", abbreviation="sram_demosp", description="Generic SRAM demo sp",
                      logo=read_image("test.png"), uri="https://demo-sp.sram.surf.nl/",
                      privacy_policy="https://edu.nl/fcgbd",
                      contact_email="sram-beheer@surf.nl", security_email="sram-beheer@surf.nl",
                      override_access_allowed_all_connections=True, automatic_connection_allowed=True,
                      allow_restricted_orgs=True,
                      access_allowed_for_all=True, sirtfi_compliant=True, research_scholarship_compliant=True,
                      code_of_conduct_compliant=True, ldap_enabled=False)

    demo_rp = Service(entity_id="APP-18DE6298-7BDD-4CFA-9399-E1CC62E8DE05",
                      name=service_sram_demo_sp, abbreviation="sram_demorp", description="Generic SRAM demo rp",
                      logo=read_image("test.png"), uri="https://demo-sp.sram.surf.nl/",
                      privacy_policy="https://edu.nl/fcgbd",
                      contact_email="sram-beheer@surf.nl", security_email="sram-beheer@surf.nl",
                      override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                      allow_restricted_orgs=True,
                      access_allowed_for_all=True,
                      sirtfi_compliant=True, research_scholarship_compliant=True, code_of_conduct_compliant=True,
                      ldap_enabled=False)

    service_monitor = Service(entity_id="https://ldap-monitor.example.org", name="LDAP/SCIM Monitor Service",
                              description="Used for monitoring LDAP and SCIM.  NIET AANKOMEN.",
                              override_access_allowed_all_connections=False, automatic_connection_allowed=True,
                              logo=read_image("ldap.png"),
                              allowed_organisations=[uuc, uva], abbreviation="ldap_mon",
                              privacy_policy="https://privacy.org", accepted_user_policy="https://example.nl/aup",
                              contact_email="admin@exmaple.nl", security_email="sec@example.nl",
                              ldap_password="$2b$12$GLjC5hK59aeDcEe.tHHJMO.SQQjFgIIpZ7VaKTIsBn05z/gE7JQny",
                              ldap_enabled=True,
                              scim_enabled=True, scim_url="https://scim-monitor.sram.surf.nl/scim/tst",
                              scim_bearer_token="server_token", scim_client_enabled=True)
    service_monitor.ldap_identifier = service_monitor.entity_id

    service_token_monitor_scim = ServiceToken(hashed_token=secure_hash("Axyz_geheim"), description="Monitor token",
                                              service=service_monitor, token_type=SERVICE_TOKEN_SCIM)

    persist_instance(db, mail, wireless, cloud, storage, wiki, network, service_ssh_uva, uuc_scheduler, demo_sp,
                     demo_rp, service_monitor, service_token_monitor_scim)

    service_group_mail = ServiceGroup(name=service_group_mail_name,
                                      short_name="mail",
                                      auto_provision_members=True,
                                      description="Mail group",
                                      service=mail)
    service_group_wiki1 = ServiceGroup(name=service_group_wiki_name1,
                                       short_name="wiki1",
                                       auto_provision_members=False,
                                       description="Wiki group 1",
                                       service=wiki)
    service_group_wiki2 = ServiceGroup(name=service_group_wiki_name2,
                                       short_name="wiki2",
                                       auto_provision_members=True,
                                       description="Wiki group 2",
                                       service=wiki)
    persist_instance(db, service_group_mail, service_group_wiki1, service_group_wiki2)

    service_token_cloud_introspection = ServiceToken(hashed_token=secure_hash(service_cloud_token),
                                                     description="Cloud token", service=cloud,
                                                     token_type=SERVICE_TOKEN_INTROSPECTION)
    service_token_cloud_scim = ServiceToken(hashed_token=secure_hash(service_cloud_token), description="Cloud token",
                                            service=cloud, token_type=SERVICE_TOKEN_SCIM)
    service_token_network_introspection = ServiceToken(hashed_token=secure_hash(service_network_token),
                                                       description="Network token", service=network,
                                                       token_type=SERVICE_TOKEN_INTROSPECTION)
    service_token_network_scim = ServiceToken(hashed_token=secure_hash(service_network_token),
                                              description="Network token", service=network,
                                              token_type=SERVICE_TOKEN_SCIM)
    service_token_storage_pam = ServiceToken(hashed_token=secure_hash(service_storage_token),
                                             description="Storage token", service=storage, token_type=SERVICE_TOKEN_PAM)
    service_token_storage_scim = ServiceToken(hashed_token=secure_hash(service_storage_token),
                                              description="Storage token", service=storage,
                                              token_type=SERVICE_TOKEN_PAM)
    service_token_wiki_introspection = ServiceToken(hashed_token=secure_hash(service_wiki_token),
                                                    description="Wiki token", service=wiki,
                                                    token_type=SERVICE_TOKEN_INTROSPECTION)
    service_token_wiki_scim = ServiceToken(hashed_token=secure_hash(service_wiki_token),
                                           description="Wiki token", service=wiki,
                                           token_type=SERVICE_TOKEN_SCIM)
    persist_instance(db, service_token_cloud_introspection, service_token_cloud_scim,
                     service_token_network_introspection, service_token_network_scim, service_token_storage_pam,
                     service_token_storage_scim, service_token_wiki_introspection, service_token_wiki_scim)

    service_invitation_cloud = ServiceInvitation(message="Please join", hash=service_invitation_cloud_hash,
                                                 expiry_date=dt_today() + datetime.timedelta(days=14),
                                                 invitee_email="admin@cloud.org", service=cloud,
                                                 intended_role="admin",
                                                 user=john)
    service_invitation_wiki_expired = ServiceInvitation(message="Please join",
                                                        hash=service_invitation_wiki_expired_hash,
                                                        expiry_date=dt_today() - datetime.timedelta(days=21),
                                                        intended_role="admin",
                                                        invitee_email="pass@wiki.org", service=wiki, user=john)
    persist_instance(db, service_invitation_cloud, service_invitation_wiki_expired)

    service_membership_james = ServiceMembership(role="admin", user=james, service=cloud)
    service_membership_service_admin_1 = ServiceMembership(role="admin", user=service_admin, service=storage)
    service_membership_service_admin_2 = ServiceMembership(role="admin", user=service_admin, service=network)
    service_membership_wiki = ServiceMembership(role="admin", user=service_admin, service=wiki)
    service_membership_mail = ServiceMembership(role="admin", user=service_admin, service=mail)
    service_membership_betty = ServiceMembership(role="admin", user=betty, service=service_ssh_uva)
    persist_instance(db, service_membership_james, service_membership_service_admin_1,
                     service_membership_service_admin_2, service_membership_wiki, service_membership_mail,
                     service_membership_betty)

    service_iprange_cloud_v4 = IpNetwork(network_value="82.217.86.55/24", service=cloud)
    service_iprange_cloud_v6 = IpNetwork(network_value="2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128", service=cloud)
    service_iprange_wiki_v4 = IpNetwork(network_value="82.217.86.55/24", service=wiki)
    service_iprange_wiki_v6 = IpNetwork(network_value="2001:1c02:2b2f:be01:1cf0:fd5a:a548:1a16/128", service=wiki)
    persist_instance(db, service_iprange_cloud_v4, service_iprange_cloud_v6, service_iprange_wiki_v4,
                     service_iprange_wiki_v6)

    uuc.services.append(uuc_scheduler)
    uuc.services.append(wiki)

    tag_uuc = Tag(tag_value="tag_uuc")
    tag_uva = Tag(tag_value="tag_ufra")
    tag_orphan = Tag(tag_value="tag_orphan")
    persist_instance(db, tag_uuc, tag_uva, tag_orphan)

    ai_computing = Collaboration(name=co_ai_computing_name,
                                 identifier=co_ai_computing_uuid,
                                 global_urn=f"ucc:{co_ai_computing_short_name}",
                                 description="Artificial Intelligence computing for the Unincorporated Urban Community",
                                 logo=read_image("computing.png"),
                                 organisation=uuc, services=[mail, network],
                                 join_requests=[], invitations=[],
                                 tags=[tag_uuc],
                                 units=[uuc_unit_support],
                                 short_name=co_ai_computing_short_name,
                                 website_url="https://www.google.nl",
                                 accepted_user_policy="https://www.google.nl",
                                 disclose_email_information=True,
                                 disclose_member_information=True)
    uva_research = Collaboration(name=co_research_name,
                                 short_name="research",
                                 global_urn="ufra:research",
                                 identifier=co_research_uuid,
                                 tags=[tag_uva],
                                 website_url="https://www.google.nl",
                                 description="University of Amsterdam Research - Urban Crowd Control",
                                 logo=read_image("research.png"),
                                 organisation=uva, services=[cloud, storage, wiki],
                                 join_requests=[], invitations=[],
                                 disclose_member_information=True)
    uuc_teachers = Collaboration(name=co_teachers_name,
                                 identifier="033cbc91-45ed-4020-bf86-3cc323e1f1cf",
                                 global_urn=f"ucc:{co_teachers_name}",
                                 website_url="https://www.google.nl",
                                 description="UUC Teachers",
                                 logo=read_image("teachers.png"),
                                 organisation=uuc, services=[],
                                 join_requests=[], invitations=[],
                                 short_name="uuc_teachers_short_name",
                                 accepted_user_policy="https://www.uuc.nl/teachers")

    monitoring_co_1 = Collaboration(name=co_monitoring_name,
                                    identifier="37d55167-23e4-4099-ae20-4f3d8d284b14",
                                    uuid4="b85e2ae6-05f3-4c27-9078-e11a420bdc08",
                                    global_urn="ucc:monitoring1",
                                    website_url="https://www.google.nl",
                                    description="CO voor monitoring.  NIET AANKOMEN.",
                                    logo=read_image("monitor1.png"),
                                    organisation=uuc, services=[service_monitor],
                                    join_requests=[], invitations=[],
                                    short_name="monitor1",
                                    accepted_user_policy="https://www.uuc.nl/monitor")
    monitoring_co_2 = Collaboration(name="Monitoring CO numero 2",
                                    identifier="4c1095e5-ae60-4d6d-8bfe-f711d0f81942",
                                    uuid4="716065e3-5154-4883-b1a6-06d6e32f11e9",
                                    global_urn="tue:monitoring2",
                                    website_url="https://www.google.nl",
                                    description="CO voor monitoring.  NIET AANKOMEN.",
                                    logo=read_image("monitor2.png"),
                                    organisation=tue, services=[service_monitor],
                                    join_requests=[], invitations=[],
                                    short_name="monitor2",
                                    accepted_user_policy="https://www.tue.example.nl/monitor")

    uu_disabled_join_request = Collaboration(name=co_robotics_disabled_join_request_name,
                                             short_name="ai_short",
                                             global_urn="ufra:ai_short",
                                             website_url="https://www.google.nl",
                                             logo=read_image("robot.png"),
                                             identifier="568eed02-0e46-48ab-83fe-116d2a8a58c5",
                                             description="Artificiation AI",
                                             disable_join_requests=True,
                                             organisation=uva,
                                             services=[],
                                             join_requests=[], invitations=[])
    persist_instance(db, ai_computing, uva_research, uu_disabled_join_request, uuc_teachers,
                     monitoring_co_1, monitoring_co_2)

    john_ai_computing = CollaborationMembership(role="member", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    jane_ai_computing = CollaborationMembership(role="member", user=jane, collaboration=ai_computing)
    sarah_ai_computing = CollaborationMembership(role="member", user=sarah, collaboration=ai_computing)

    betty_uuc_teachers = CollaborationMembership(role="member", user=betty, collaboration=uuc_teachers)
    betty_uuc_ai_computing = CollaborationMembership(role="member", user=betty, collaboration=ai_computing)

    roger_uva_research = CollaborationMembership(role="member", user=roger, collaboration=uva_research)
    peter_uva_research = CollaborationMembership(role="member", user=peter, collaboration=uva_research)
    sarah_uva_research = CollaborationMembership(role="admin", user=sarah, collaboration=uva_research)
    user_two_suspend_uva_research = CollaborationMembership(role="member", user=user_deletion_warning,
                                                            collaboration=uva_research)

    paul_monitoring_co_1 = CollaborationMembership(role="member", user=paul, collaboration=monitoring_co_1)
    betty_monitoring_co_1 = CollaborationMembership(role="member", user=betty, collaboration=monitoring_co_1)
    betty_monitoring_co_2 = CollaborationMembership(role="member", user=betty, collaboration=monitoring_co_2)
    harry_monitoring_co_2 = CollaborationMembership(role="member", user=harry, collaboration=monitoring_co_2)

    persist_instance(db, john_ai_computing, admin_ai_computing, roger_uva_research, peter_uva_research,
                     sarah_uva_research,
                     jane_ai_computing, sarah_ai_computing, user_two_suspend_uva_research, betty_uuc_teachers,
                     betty_uuc_ai_computing,
                     paul_monitoring_co_1, betty_monitoring_co_1, betty_monitoring_co_2, harry_monitoring_co_2)

    admin_service_aups = [ServiceAup(user=admin, service=service, aup_url=service.accepted_user_policy) for service in
                          ai_computing.services]
    persist_instance(db, *admin_service_aups)

    group_researchers = Group(name=group_ai_researchers,
                              short_name=group_ai_researchers_short_name,
                              global_urn="uuc:ai_computing:ai_res",
                              identifier=group_ai_researchers_identifier,
                              auto_provision_members=False,
                              description="Artificial computing researchers",
                              collaboration=ai_computing,
                              collaboration_memberships=[john_ai_computing,
                                                         jane_ai_computing])
    group_developers = Group(name="AI developers",
                             short_name="ai_dev",
                             global_urn="uuc:ai_computing:ai_dev",
                             identifier=group_ai_dev_identifier,
                             auto_provision_members=False,
                             description="Artificial computing developers",
                             collaboration=ai_computing,
                             collaboration_memberships=[john_ai_computing])
    group_science = Group(name=group_science_name,
                          short_name="science",
                          global_urn="ufra:research:science",
                          identifier=group_science_identifier,
                          auto_provision_members=True,
                          description="Science",
                          collaboration=uva_research,
                          collaboration_memberships=[roger_uva_research])

    group_service_mail = Group(name=service_group_mail_name,
                               short_name="mail-mail",
                               global_urn="uuc:ai_computing:mail-mail",
                               identifier="9946ca40-2a53-40a8-bc63-fb0758e716e3",
                               auto_provision_members=False,
                               description="Provisioned by service Mail Services - Mail group",
                               collaboration=uva_research,
                               collaboration_memberships=[],
                               service_group=service_group_mail)
    persist_instance(db, group_researchers, group_developers, group_science, group_service_mail)

    join_request_john = JoinRequest(message="Please...", reference=co_ai_computing_join_request_john_reference, user=john,
                                    collaboration=ai_computing, hash=generate_token(), status="open")
    join_request_peter = JoinRequest(message="Please...", user=peter, collaboration=ai_computing,
                                     hash=co_ai_computing_join_request_peter_hash, status="open")
    join_request_mary = JoinRequest(message="Please...", user=mary, collaboration=ai_computing, hash=generate_token(),
                                    status="open")
    join_request_uva_research = JoinRequest(message="Please...", user=james, collaboration=uva_research,
                                            hash=generate_token(), status="open")

    persist_instance(db, join_request_john, join_request_peter, join_request_mary, join_request_uva_research)

    invitation = Invitation(hash=invitation_hash_curious, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=default_expiry_date(), user=admin, message="Please join...",
                            intended_role="admin", status="open", created_by="system")
    invitation_accepted = Invitation(hash=generate_token(), invitee_email="some@ex.org", collaboration=ai_computing,
                                     expiry_date=default_expiry_date(), user=admin, message="Please join...",
                                     status="accepted", intended_role="admin")
    invitation_uva = Invitation(hash=invitation_hash_uva, invitee_email="ufra@ex.org", collaboration=uva_research,
                                expiry_date=default_expiry_date(), user=admin, message="Please join...",
                                intended_role="member", groups=[group_science], status="open")
    invitation_noway = Invitation(hash=invitation_hash_no_way, invitee_email="noway@ex.org", collaboration=ai_computing,
                                  expiry_date=dt_today() - datetime.timedelta(days=21), user=admin,
                                  intended_role="member", status="expired",
                                  message="Let me please join as I really, really, really \n really, "
                                          "really, really \n want to...")
    persist_instance(db, invitation, invitation_accepted, invitation_uva, invitation_noway)

    collaboration_request_1 = CollaborationRequest(name=collaboration_request_name, short_name="new_collaboration",
                                                   website_url="https://google.com", logo=read_image("request.png"),
                                                   status=STATUS_OPEN, message="For research", organisation=uuc,
                                                   requester=peter, description="please", units=[uuc_unit_research])
    collaboration_request_2 = CollaborationRequest(name="Polse", short_name="polse",
                                                   website_url="https://www.pols.me/", logo=read_image("pols.png"),
                                                   status=STATUS_OPEN, message="For research", organisation=uuc,
                                                   requester=peter, description="please")
    persist_instance(db, collaboration_request_1, collaboration_request_2)

    service_connection_request_network = ServiceConnectionRequest(message="AI computing needs storage",
                                                                  hash=service_connection_request_network_hash,
                                                                  requester=admin, collaboration=ai_computing,
                                                                  pending_organisation_approval=False,
                                                                  service=storage)
    service_connection_request_wiki = ServiceConnectionRequest(message="UFra research needs ssh",
                                                               hash=service_connection_request_ssh_hash,
                                                               requester=sarah, collaboration=uva_research,
                                                               pending_organisation_approval=True,
                                                               service=service_ssh_uva)
    persist_instance(db, service_connection_request_network, service_connection_request_wiki)

    user_token_sarah = UserToken(name="token", description="some", hashed_token=secure_hash(user_sarah_user_token_network),
                                 user=sarah, service=network)
    user_token_betty_for_wiki = UserToken(name="token", description="some",
                                          hashed_token=secure_hash(user_betty_user_token_wiki),
                                          user=betty, service=wiki)
    persist_instance(db, user_token_sarah, user_token_betty_for_wiki)

    pam_sso_session_peter = PamSSOSession(session_id=pam_session_id, attribute="email", user=peter, service=storage,
                                          pin="1234")
    pam_sso_session_james = PamSSOSession(session_id=pam_invalid_service_session_id, attribute="email", user=james,
                                          service=storage, pin="1234")
    persist_instance(db, pam_sso_session_peter, pam_sso_session_james)

    service_request_gpt = ServiceRequest(name=service_request_gpt_name, abbreviation="gpt",
                                         description="We need more AI", logo=read_image("computing.png"),
                                         uuid4=str(uuid.uuid4()), providing_organisation="Cloudy",
                                         uri_info="https://login.org", uri="https://website.org",
                                         contact_email="contact@gpt.org", support_email="support@gpt.org",
                                         security_email="security@gpt.org", privacy_policy="https://privacy_policy.org",
                                         accepted_user_policy="https://accepted_user_policy.org",
                                         code_of_conduct_compliant=True, sirtfi_compliant=True,
                                         research_scholarship_compliant=True, status="open", comments="Please",
                                         connection_type="openIDConnect",
                                         redirect_urls="https://redirect.org, https://redirect.alternative.org",
                                         requester=sarah)
    persist_instance(db, service_request_gpt)

    db.session.commit()
