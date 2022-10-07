# -*- coding: future_fstrings -*-
import base64
import datetime
import os
import uuid

from sqlalchemy import text

from server.api.collaboration_request import STATUS_OPEN
from server.auth.secrets import secure_hash, generate_token
from server.db.audit_mixin import metadata
from server.db.defaults import default_expiry_date
from server.db.domain import User, Organisation, OrganisationMembership, Service, Collaboration, \
    CollaborationMembership, JoinRequest, Invitation, Group, OrganisationInvitation, ApiKey, CollaborationRequest, \
    ServiceConnectionRequest, SuspendNotification, Aup, SchacHomeOrganisation, SshKey, ServiceGroup, ServiceInvitation, \
    ServiceMembership, ServiceAup, UserToken, UserIpNetwork, Tag, PamSSOSession, IpNetwork, ServiceToken

collaboration_request_name = "New Collaboration"

join_request_reference = "Dr. Johnson"

the_boss_name = "The Boss"
roger_name = "Roger Doe"
john_name = "John Doe"
mike_name = "Mike Doe"
james_name = "James Byrd"
sarah_name = "Sarah Cross"
jane_name = "Jane Doe"

schac_home_organisation = "example.org"
schac_home_organisation_uuc = "rug.nl"

organisation_invitation_hash = generate_token()
organisation_invitation_expired_hash = generate_token()

invitation_hash_curious = generate_token()
invitation_hash_no_way = generate_token()
invitation_hash_uva = generate_token()

service_invitation_hash = generate_token()
service_invitation_expired_hash = generate_token()

service_cloud_token = generate_token()
network_cloud_token = generate_token()
service_storage_token = generate_token()
wiki_cloud_token = generate_token()

sarah_user_token = generate_token()
betty_user_token_wiki = generate_token()

collaboration_ai_computing_uuid = str(uuid.uuid4())
ai_computing_name = "AI computing"
ai_computing_short_name = "ai_computing"

uuc_teachers_name = "UUC Teachers"

uuc_name = "UUC"
uuc_secret = generate_token()
uuc_hashed_secret = secure_hash(uuc_secret)

amsterdam_uva_name = "Amsterdam UVA"

collaboration_uva_researcher_uuid = str(uuid.uuid4())

uva_research_name = "UVA UCC research"

uu_disabled_join_request_name = "UU"
join_request_peter_hash = generate_token()

service_mail_name = "Mail Services"
service_mail_entity_id = "https://mail"

service_network_name = "Network Services"
service_network_entity_id = "https://network"
service_wiki_entity_id = "https://wiki"
service_storage_entity_id = "https://storage"
service_cloud_entity_id = "https://cloud"
uuc_scheduler_entity_id = "uuc_scheduler_entity_id"

service_storage_name = "Storage"
service_wireless_name = "Wireless"
service_cloud_name = "Cloud"
service_wiki_name = "Wiki"
service_ssh_uva_name = "SSH UvA"
uuc_scheduler_name = "uuc_scheduler_name"

service_group_mail_name = "service_group_mail_name"
service_group_wiki_name1 = "service_group_wiki_name_1"
service_group_wiki_name2 = "service_group_wiki_name_2"

ai_researchers_group = "AI researchers"
ai_researchers_group_short_name = "ai_res"
group_science_name = "Science"

network_service_connection_request_hash = generate_token()
ssh_service_connection_request_hash = generate_token()
wireless_service_connection_request_hash = generate_token()

pam_session_id = str(uuid.uuid4())
invalid_service_pam_session_id = str(uuid.uuid4())


def read_image(file_name, directory="images"):
    file = f"{os.path.dirname(os.path.realpath(__file__))}/{directory}/{file_name}"
    with open(file, "rb") as f:
        c = f.read()
        return base64.encodebytes(c).decode("utf-8")


def persist_instance(db, *objs):
    required_attrs = ["created_by", "updated_by"]
    for obj in objs:
        for attr in required_attrs:
            if hasattr(obj, attr):
                setattr(obj, attr, "urn:admin")
        if isinstance(obj, User):
            aup = Aup(au_version="1", user=obj)
            db.session.add(aup)
        db.session.add(obj)


def clean_db(db):
    tables = reversed(metadata.sorted_tables)
    for table in tables:
        db.session.execute(table.delete())
    db.session.execute(text("DELETE FROM audit_logs"))
    db.session.commit()


def seed(db, app_config, skip_seed=False, perf_test=False):
    clean_db(db)

    if skip_seed:
        return

    john = User(uid="urn:john", name=john_name, email="john@example.org", username="john",
                address="Postal 1234AA")
    peter = User(uid="urn:peter", name="Peter Doe", email="peter@example.org", username="peter")
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org", username="mdoe",
                schac_home_organisation=schac_home_organisation)
    admin = User(uid="urn:admin", name=the_boss_name, email="boss@example.org", username="admin")
    roger = User(uid="urn:roger", name=roger_name, email="roger@example.org",
                 schac_home_organisation=schac_home_organisation, username="roger")
    harry = User(uid="urn:harry", name="Harry Doe", email="harry@example.org", username="harry")
    james = User(uid="urn:james", name=james_name, email="james@example.org", username="james",
                 schac_home_organisation=schac_home_organisation_uuc, given_name="James")
    sarah = User(uid="urn:sarah", name=sarah_name, email="sarah@uva.org", application_uid="sarah_application_uid",
                 username="sarah")
    betty = User(uid="urn:betty", name="betty", email="betty@uuc.org", username="betty")
    jane = User(uid="urn:jane", name=jane_name, email="jane@ucc.org", username="jane",
                entitlement="urn:mace:surf.nl:sram:allow-create-co")
    paul = User(uid="urn:paul", name="Paul Doe", email="paul@ucc.org", username="paul",
                schac_home_organisation="example.com")
    service_admin = User(uid="urn:service_admin", name="Service Admin", email="service_admin@ucc.org",
                         username="service_admin", schac_home_organisation="service_admin.com")
    # User seed for suspend testing
    retention = app_config.retention
    current_time = datetime.datetime.utcnow()
    retention_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days + 1)

    user_inactive = User(uid="urn:inactive", name="inactive", email="inactive@example.org", username="inacative",
                         last_login_date=retention_date, last_accessed_date=retention_date,
                         schac_home_organisation="not.exists")
    user_one_suspend = User(uid="urn:one_suspend", name="one_suspend", email="one_suspend@example.org",
                            username="1suspend",
                            last_login_date=retention_date, last_accessed_date=retention_date)

    user_two_suspend = User(uid="urn:two_suspend", name="two_suspend", email="two_suspend@example.org",
                            username="2suspend",
                            last_login_date=retention_date, last_accessed_date=retention_date)

    last_login_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days + 30)
    user_suspended = User(uid="urn:suspended", name="suspended", email="suspended@example.org", username="suspended",
                          last_login_date=last_login_date, last_accessed_date=last_login_date,
                          suspended=True)

    deletion_date = current_time - datetime.timedelta(days=retention.remove_suspended_users_period_days + 30)
    user_to_be_deleted = User(uid="urn:to_be_deleted", name="to_be_deleted", email="to_be_deleted@example.org",
                              last_login_date=deletion_date, last_accessed_date=deletion_date, username="deleted",
                              suspended=True)

    persist_instance(db, john, mary, peter, admin, roger, harry, james, sarah, betty, jane,
                     user_inactive, user_one_suspend, user_two_suspend, user_suspended, user_to_be_deleted, paul,
                     service_admin)

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

    resend_suspension_date = current_time - datetime.timedelta(retention.reminder_resent_period_days + 1)
    user_one_suspend_notification1 = SuspendNotification(user=user_one_suspend, sent_at=resend_suspension_date,
                                                         is_primary=True)

    resend_suspension_date = current_time - datetime.timedelta(retention.reminder_resent_period_days + 1)
    user_two_suspend_notification1 = SuspendNotification(user=user_two_suspend, sent_at=resend_suspension_date,
                                                         is_primary=True)
    resend_suspension_date = current_time - datetime.timedelta(retention.reminder_expiry_period_days + 1)
    user_two_suspend_notification2 = SuspendNotification(user=user_two_suspend, sent_at=resend_suspension_date,
                                                         is_primary=False)
    user_suspended_notification1 = SuspendNotification(user=user_suspended, sent_at=resend_suspension_date,
                                                       is_primary=True)
    user_suspended_notification2 = SuspendNotification(user=user_suspended, sent_at=resend_suspension_date,
                                                       is_primary=False)

    persist_instance(db, user_one_suspend_notification1, user_two_suspend_notification1, user_two_suspend_notification2,
                     user_suspended_notification1, user_suspended_notification2)

    uuc = Organisation(name=uuc_name, short_name="uuc", identifier=str(uuid.uuid4()),
                       description="Unincorporated Urban Community", logo=read_image("uuc.jpeg"),
                       created_by="urn:admin", updated_by="urnadmin", category="Research",
                       on_boarding_msg="We are using **SRAM** to provide access to the following research tools:"
                                       "\n- Wiki\n- Cloud\n- Awesome things...\n\nIf you want to join one of our "
                                       "collaborations, please send a mail to [support@uuc.nl](mailto:support@uuc.nl)."
                                       "\n<br/><br/>\nHappy researching,\n\n*UUC support*",
                       collaboration_creation_allowed=True)
    uva = Organisation(name=amsterdam_uva_name, description="University of Amsterdam", identifier=str(uuid.uuid4()),
                       created_by="urn:admin", updated_by="urn:admin", short_name="uva", logo=read_image("uva.jpg"),
                       category="University")
    tue = Organisation(name="TUE", description="University of Eindhoven", identifier=str(uuid.uuid4()),
                       created_by="urn:admin", updated_by="urn:admin", short_name="tue", logo=read_image("tue.jpeg"),
                       category="University")
    persist_instance(db, uuc, uva, tue)

    shouuc = SchacHomeOrganisation(name=schac_home_organisation_uuc, organisation=uuc, created_by="urn:admin",
                                   updated_by="urn:admin")
    shouva = SchacHomeOrganisation(name=schac_home_organisation, organisation=uva, created_by="urn:admin",
                                   updated_by="urn:admin")
    persist_instance(db, shouuc, shouva)

    api_key = ApiKey(hashed_secret=uuc_hashed_secret, organisation=uuc, description="API access",
                     created_by="urn:admin", updated_by="urn:admin")
    persist_instance(db, api_key)
    organisation_invitation_roger = OrganisationInvitation(message="Please join", hash=organisation_invitation_hash,
                                                           expiry_date=datetime.date.today() + datetime.timedelta(
                                                               days=14),
                                                           invitee_email="roger@example.org", organisation=uuc,
                                                           intended_role="admin",
                                                           user=john)
    organisation_invitation_pass = OrganisationInvitation(message="Let me please join as I "
                                                                  "really, really, really \n really, "
                                                                  "really, really \n want to...",
                                                          hash=organisation_invitation_expired_hash,
                                                          expiry_date=datetime.date.today() - datetime.timedelta(
                                                              days=21),
                                                          intended_role="admin",
                                                          invitee_email="pass@example.org", organisation=uuc, user=john)
    persist_instance(db, organisation_invitation_roger, organisation_invitation_pass)

    organisation_membership_john = OrganisationMembership(role="admin", user=john, organisation=uuc)
    organisation_membership_mary = OrganisationMembership(role="admin", user=mary, organisation=uuc)
    organisation_membership_harry = OrganisationMembership(role="manager", user=harry, organisation=uuc)
    organisation_membership_jane = OrganisationMembership(role="admin", user=jane, organisation=uva)
    organisation_membership_paul_uuc = OrganisationMembership(role="manager", user=paul, organisation=uuc)
    organisation_membership_paul_uva = OrganisationMembership(role="manager", user=paul, organisation=uva)
    persist_instance(db, organisation_membership_john, organisation_membership_mary, organisation_membership_harry,
                     organisation_membership_jane, organisation_membership_paul_uuc, organisation_membership_paul_uva)

    mail = Service(entity_id=service_mail_entity_id, name=service_mail_name, contact_email=john.email,
                   public_visible=True, automatic_connection_allowed=True, logo=read_image("email.jpeg"),
                   accepted_user_policy="https://google.nl", allowed_organisations=[uuc, uva], abbreviation="mail",
                   privacy_policy="https://privacy.org", security_email="sec@org.nl")
    wireless = Service(entity_id="https://wireless", name=service_wireless_name, description="Network Wireless Service",
                       public_visible=True, automatic_connection_allowed=True, contact_email=john.email,
                       logo=read_image("wireless.png"), accepted_user_policy="https://google.nl", abbreviation="wire",
                       allowed_organisations=[uuc, uva], uri="https://wireless", non_member_users_access_allowed=True,
                       privacy_policy="https://privacy.org", security_email="sec@org.nl")
    cloud = Service(entity_id=service_cloud_entity_id, name=service_cloud_name, description="SARA Cloud Service",
                    public_visible=True, automatic_connection_allowed=True, logo=read_image("cloud.jpg"),
                    allowed_organisations=[uuc, uva], abbreviation="cloud", privacy_policy="https://privacy.org",
                    token_enabled=True, token_validity_days=1, security_email="sec@org.nl")
    storage = Service(entity_id=service_storage_entity_id, name=service_storage_name, allowed_organisations=[uuc, uva],
                      description="SURF Storage Service", logo=read_image("storage.jpeg"), abbreviation="storage",
                      public_visible=True, automatic_connection_allowed=True, white_listed=True,
                      uri="https://storage.net", support_email="support@storage.net",
                      pam_web_sso_enabled=True, security_email="sec@org.nl",
                      accepted_user_policy="https://google.nl", privacy_policy="https://privacy.org")
    wiki = Service(entity_id=service_wiki_entity_id, name=service_wiki_name, description="No more wiki's please",
                   uri="https://wiki.surfnet.nl/display/SCZ/Collaboration+Management+System+%28Dutch%3A+"
                       "SamenwerkingBeheerSysteem%29+-+SBS#CollaborationManagementSystem"
                       "(Dutch:SamenwerkingBeheerSysteem)-SBS-DevelopmentofnewopensourceCollaborationManagementSystem",
                   public_visible=True, automatic_connection_allowed=False, logo=read_image("wiki.jpeg"),
                   allowed_organisations=[uuc, uva], contact_email="help@wiki.com", abbreviation="wiki",
                   accepted_user_policy="https://google.nl", privacy_policy="https://privacy.org",
                   ldap_password="$6$rounds=100000$bFyBZD0Fim7BCAqt$BSq4u2IqhyT2khkCMILpaEceMnvYIKvxyxttA8."
                                 "IddqWdPB.AEH2MBb1sggk8pDlrW/Xb00f8xa67cC0nfkuX.",
                   token_enabled=True, token_validity_days=365, security_email="sec@org.nl")
    network = Service(entity_id=service_network_entity_id, name=service_network_name,
                      description="Network enabling service SSH access", address="Some address",
                      uri="https://uri.net", identity_type="SSH KEY", accepted_user_policy="https://aup.org",
                      contact_email="help@network.com", logo=read_image("network.jpeg"),
                      public_visible=False, automatic_connection_allowed=True, abbreviation="network",
                      allowed_organisations=[uuc], privacy_policy="https://privacy.org",
                      token_enabled=True, token_validity_days=365, security_email="sec@org.nl")
    service_ssh_uva = Service(entity_id="service_ssh_uva", name=service_ssh_uva_name,
                              description="Uva SSH access",
                              uri="https://uri.com/ssh", identity_type="SSH KEY", accepted_user_policy="https://ssh",
                              contact_email="help@ssh.com", logo=read_image("ssh_uva.png"),
                              public_visible=False, automatic_connection_allowed=False, abbreviation="service_ssh",
                              allowed_organisations=[uva], research_scholarship_compliant=True,
                              code_of_conduct_compliant=True, sirtfi_compliant=True,
                              privacy_policy="https://privacy.org", security_email="sec@org.nl")

    uuc_scheduler = Service(entity_id=uuc_scheduler_entity_id, name=uuc_scheduler_name,
                            accepted_user_policy="https://google.nl", abbreviation="uuc_scheduler",
                            description="UUC Scheduler Service", logo=read_image("scheduler_uuc.jpeg"),
                            public_visible=True, automatic_connection_allowed=False, allowed_organisations=[uuc],
                            privacy_policy="https://privacy.org", security_email="sec@org.nl")

    demo_sp = Service(entity_id="https://demo-sp.sram.surf.nl/saml/module.php/saml/sp/metadata.php/test",
                      name="SRAM Demo SP", abbreviation="sram_demosp", description="Generic SRAM demo sp",
                      logo=read_image("test.png"), uri=("https://demo-sp.sram.surf.nl/"),
                      privacy_policy="https://wiki.surfnet.nl/display/SRAM/Privacy+Policy",
                      contact_email="sram-beheer@surf.nl", security_email="sram-beheer@surf.nl",
                      public_visible=True, automatic_connection_allowed=True, white_listed=True,
                      access_allowed_for_all=True,
                      sirtfi_compliant=True,
                      research_scholarship_compliant=True, code_of_conduct_compliant=True,
                      )

    persist_instance(db, mail, wireless, cloud, storage, wiki, network, service_ssh_uva, uuc_scheduler, demo_sp)

    service_token_cloud = ServiceToken(hashed_token=secure_hash(service_cloud_token), description="Cloud token",
                                       service=cloud)
    service_token_storage = ServiceToken(hashed_token=secure_hash(service_storage_token), description="Storage token",
                                         service=storage)
    service_token_wiki = ServiceToken(hashed_token=secure_hash(wiki_cloud_token), description="Wiki token",
                                      service=wiki)
    service_token_network = ServiceToken(hashed_token=secure_hash(network_cloud_token), description="Network token",
                                         service=network)
    persist_instance(db, service_token_cloud, service_token_storage, service_token_wiki, service_token_network)

    service_invitation_cloud = ServiceInvitation(message="Please join", hash=service_invitation_hash,
                                                 expiry_date=datetime.date.today() + datetime.timedelta(days=14),
                                                 invitee_email="admin@cloud.org", service=cloud,
                                                 intended_role="admin",
                                                 user=john)
    service_invitation_wiki_expired = ServiceInvitation(message="Please join",
                                                        hash=service_invitation_expired_hash,
                                                        expiry_date=datetime.date.today() - datetime.timedelta(
                                                            days=21),
                                                        intended_role="admin",
                                                        invitee_email="pass@wiki.org", service=wiki, user=john)
    persist_instance(db, service_invitation_cloud, service_invitation_wiki_expired)

    service_membership_james = ServiceMembership(role="admin", user=james, service=cloud)
    service_membership_service_admin_1 = ServiceMembership(role="admin", user=service_admin, service=storage)
    service_membership_service_admin_2 = ServiceMembership(role="admin", user=service_admin, service=network)
    service_membership_wiki = ServiceMembership(role="admin", user=service_admin, service=wiki)
    persist_instance(db, service_membership_james, service_membership_service_admin_1,
                     service_membership_service_admin_2,
                     service_membership_wiki)

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
                                       auto_provision_members=False,
                                       description="Wiki group 2",
                                       service=wiki)
    persist_instance(db, service_group_mail, service_group_wiki1, service_group_wiki2)

    service_iprange_cloud_v4 = IpNetwork(network_value="192.0.2.0/24", service=cloud)
    service_iprange_cloud_v6 = IpNetwork(network_value="2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128", service=cloud)
    service_iprange_wiki_v4 = IpNetwork(network_value="192.0.2.0/24", service=wiki)
    service_iprange_wiki_v6 = IpNetwork(network_value="2001:1c02:2b2f:be01:1cf0:fd5a:a548:1a16/128", service=wiki)
    persist_instance(db, service_iprange_cloud_v4, service_iprange_cloud_v6, service_iprange_wiki_v4,
                     service_iprange_wiki_v6)

    uuc.services.append(uuc_scheduler)
    uuc.services.append(wiki)

    tag_uuc = Tag(tag_value="tag_uuc")
    tag_uva = Tag(tag_value="tag_uva")
    tag_orphan = Tag(tag_value="tag_orphan")
    persist_instance(db, tag_uuc, tag_uva, tag_orphan)

    ai_computing = Collaboration(name=ai_computing_name,
                                 identifier=collaboration_ai_computing_uuid,
                                 global_urn=f"ucc:{ai_computing_short_name}",
                                 description="Artifical Intelligence computing for the Unincorporated Urban Community",
                                 logo=read_image("computing.jpeg"),
                                 organisation=uuc, services=[mail, network],
                                 join_requests=[], invitations=[],
                                 tags=[tag_uuc],
                                 short_name=ai_computing_short_name,
                                 website_url="https://www.google.nl",
                                 accepted_user_policy="https://www.google.nl",
                                 disclose_email_information=True,
                                 disclose_member_information=True)
    uva_research = Collaboration(name=uva_research_name,
                                 short_name="research",
                                 global_urn="uva:research",
                                 identifier=collaboration_uva_researcher_uuid,
                                 tags=[tag_uva],
                                 website_url="https://www.google.nl",
                                 description="University of Amsterdam Research - Urban Crowd Control",
                                 logo=read_image("research.jpeg"),
                                 organisation=uva, services=[cloud, storage, wiki],
                                 join_requests=[], invitations=[],
                                 disclose_member_information=True)
    uuc_teachers = Collaboration(name=uuc_teachers_name,
                                 identifier=str(uuid.uuid4()),
                                 global_urn=f"ucc:{uuc_teachers_name}",
                                 website_url="https://www.google.nl",
                                 description="UUC Teachers",
                                 logo=read_image("teachers.jpeg"),
                                 organisation=uuc, services=[],
                                 join_requests=[], invitations=[],
                                 short_name="uuc_teachers_short_name",
                                 accepted_user_policy="https://www.uuc.nl/teachers")

    uu_disabled_join_request = Collaboration(name=uu_disabled_join_request_name,
                                             short_name="uu_short",
                                             global_urn="uva:uu_short",
                                             website_url="https://www.google.nl",
                                             logo=read_image("uu.png"),
                                             identifier=str(uuid.uuid4()),
                                             description="UU", disable_join_requests=True, organisation=uva,
                                             services=[],
                                             join_requests=[], invitations=[])
    persist_instance(db, ai_computing, uva_research, uu_disabled_join_request, uuc_teachers)

    john_ai_computing = CollaborationMembership(role="member", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    jane_ai_computing = CollaborationMembership(role="member", user=jane, collaboration=ai_computing)
    sarah_ai_computing = CollaborationMembership(role="member", user=sarah, collaboration=ai_computing)

    betty_uuc_teachers = CollaborationMembership(role="member", user=betty, collaboration=uuc_teachers)
    betty_uuc_ai_computing = CollaborationMembership(role="member", user=betty, collaboration=ai_computing)

    roger_uva_research = CollaborationMembership(role="member", user=roger, collaboration=uva_research)
    peter_uva_research = CollaborationMembership(role="member", user=peter, collaboration=uva_research)
    sarah_uva_research = CollaborationMembership(role="admin", user=sarah, collaboration=uva_research)
    user_two_suspend_uva_research = CollaborationMembership(role="member", user=user_two_suspend,
                                                            collaboration=uva_research)
    persist_instance(db, john_ai_computing, admin_ai_computing, roger_uva_research, peter_uva_research,
                     sarah_uva_research,
                     jane_ai_computing, sarah_ai_computing, user_two_suspend_uva_research, betty_uuc_teachers,
                     betty_uuc_ai_computing)

    admin_service_aups = [ServiceAup(user=admin, service=service, aup_url=service.accepted_user_policy) for service in
                          ai_computing.services]
    persist_instance(db, *admin_service_aups)

    group_researchers = Group(name=ai_researchers_group,
                              short_name=ai_researchers_group_short_name,
                              global_urn="uuc:ai_computing:ai_res",
                              identifier=str(uuid.uuid4()),
                              auto_provision_members=False,
                              description="Artifical computing researchers",
                              collaboration=ai_computing,
                              collaboration_memberships=[john_ai_computing,
                                                         jane_ai_computing])
    group_developers = Group(name="AI developers",
                             short_name="ai_dev",
                             global_urn="uuc:ai_computing:ai_dev",
                             identifier=str(uuid.uuid4()),
                             auto_provision_members=False,
                             description="Artifical computing developers",
                             collaboration=ai_computing,
                             collaboration_memberships=[john_ai_computing])
    group_science = Group(name=group_science_name,
                          short_name="science",
                          global_urn="uva:research:science",
                          identifier=str(uuid.uuid4()),
                          auto_provision_members=True,
                          description="Science",
                          collaboration=uva_research,
                          collaboration_memberships=[roger_uva_research])
    persist_instance(db, group_researchers, group_developers, group_science)

    join_request_john = JoinRequest(message="Please...", reference=join_request_reference, user=john,
                                    collaboration=ai_computing, hash=generate_token(), status="open")
    join_request_peter = JoinRequest(message="Please...", user=peter, collaboration=ai_computing,
                                     hash=join_request_peter_hash, status="open")
    join_request_mary = JoinRequest(message="Please...", user=mary, collaboration=ai_computing, hash=generate_token(),
                                    status="open")
    join_request_uva_research = JoinRequest(message="Please...", user=james, collaboration=uva_research,
                                            hash=generate_token(), status="open")

    persist_instance(db, join_request_john, join_request_peter, join_request_mary, join_request_uva_research)

    invitation = Invitation(hash=invitation_hash_curious, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=default_expiry_date(), user=admin, message="Please join...",
                            intended_role="admin", status="open")
    invitation_accepted = Invitation(hash=generate_token(), invitee_email="some@ex.org", collaboration=ai_computing,
                                     expiry_date=default_expiry_date(), user=admin, message="Please join...",
                                     status="accepted", intended_role="admin")
    invitation_uva = Invitation(hash=invitation_hash_uva, invitee_email="uva@ex.org", collaboration=uva_research,
                                expiry_date=default_expiry_date(), user=admin, message="Please join...",
                                intended_role="member", groups=[group_science], status="open")
    invitation_noway = Invitation(hash=invitation_hash_no_way, invitee_email="noway@ex.org", collaboration=ai_computing,
                                  expiry_date=datetime.date.today() - datetime.timedelta(days=21), user=admin,
                                  intended_role="member", status="expired",
                                  message="Let me please join as I really, really, really \n really, "
                                          "really, really \n want to...")
    persist_instance(db, invitation, invitation_accepted, invitation_uva, invitation_noway)

    collaboration_request_1 = CollaborationRequest(name=collaboration_request_name, short_name="new_collaboration",
                                                   website_url="https://google.com", logo=read_image("request.jpg"),
                                                   status=STATUS_OPEN, message="For research", organisation=uuc,
                                                   requester=peter)
    collaboration_request_2 = CollaborationRequest(name="Polse", short_name="polse",
                                                   website_url="https://www.pols.me/", logo=read_image("pols.jpg"),
                                                   status=STATUS_OPEN, message="For research", organisation=uuc,
                                                   requester=peter)
    persist_instance(db, collaboration_request_1, collaboration_request_2)

    service_connection_request_network = ServiceConnectionRequest(message="AI computing needs storage",
                                                                  hash=network_service_connection_request_hash,
                                                                  requester=admin, collaboration=ai_computing,
                                                                  service=storage)
    service_connection_request_wiki = ServiceConnectionRequest(message="UVA research needs ssh",
                                                               hash=ssh_service_connection_request_hash,
                                                               requester=sarah, collaboration=uva_research,
                                                               service=service_ssh_uva)
    service_connection_request_wireless = ServiceConnectionRequest(message="AI computing needs wireless",
                                                                   hash=wireless_service_connection_request_hash,
                                                                   requester=jane, collaboration=ai_computing,
                                                                   service=wireless, is_member_request=True)
    persist_instance(db, service_connection_request_network, service_connection_request_wiki,
                     service_connection_request_wireless)

    user_token_sarah = UserToken(name="token", description="some", hashed_token=secure_hash(sarah_user_token),
                                 user=sarah, service=network)
    user_token_sarah_for_wiki = UserToken(name="token", description="some",
                                          hashed_token=secure_hash(betty_user_token_wiki),
                                          user=betty, service=wiki)
    persist_instance(db, user_token_sarah, user_token_sarah_for_wiki)

    pam_sso_session_peter = PamSSOSession(session_id=pam_session_id, attribute="email", user=peter, service=storage,
                                          pin="1234")
    pam_sso_session_james = PamSSOSession(session_id=invalid_service_pam_session_id, attribute="email", user=james,
                                          service=storage, pin="1234")
    persist_instance(db, pam_sso_session_peter, pam_sso_session_james)

    if perf_test:
        users = []
        for i in range(1, 84):
            user = User(uid=f"urn:persoon:numero{i:03d}",
                        name=f"Piet Doe de {i}de",
                        email=f"pietdoe{i}@example.org",
                        username=f"pietdoe{i}",
                        schac_home_organisation="harderwijk.edu")
            users.append(user)
        persist_instance(db, *users)

        for i in range(1, 40):
            co = Collaboration(name=f"Samenwerking Numero {i}",
                               identifier=str(uuid.uuid4()),
                               short_name=f"co_nr_{i:03d}",
                               global_urn=f"ucc:co_nr_{i:03d}",
                               description="Een van vele COs",
                               logo=read_image("computing.jpeg"),
                               organisation=uuc,
                               services=[mail, network],
                               join_requests=[],
                               invitations=[],
                               website_url="https://www.google.nl",
                               accepted_user_policy="https://www.google.nl",
                               disclose_email_information=True,
                               disclose_member_information=True)
            persist_instance(db, co)
            persist_instance(db, CollaborationMembership(role="admin", user=users[2 * i + 0], collaboration=co))
            persist_instance(db, CollaborationMembership(role="member", user=users[2 * i + 1], collaboration=co))
            persist_instance(db, CollaborationMembership(role="member", user=users[2 * i + 2], collaboration=co))
            persist_instance(db, CollaborationMembership(role="member", user=users[2 * i + 3], collaboration=co))

    db.session.commit()
