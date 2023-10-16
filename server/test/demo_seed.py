#!/opt/sbs/sbs-env/bin/python
import uuid

from server.db.domain import User, Organisation, OrganisationMembership, Service, Collaboration, \
    CollaborationMembership, Group, SchacHomeOrganisation, SshKey, ServiceGroup, \
    ServiceMembership, Tag
from server.test.seed import read_image, persist_instance, clean_db


def demo_seed(db):
    clean_db(db)

    # Create organisations
    shac_home_organisation_00 = "onlineresearch.com"
    shac_home_organisation_01 = "school4us.org"

    organisations = [
        {
            "name": "Online Resarch bv",
            "short_name": "onlresbv",
            "description": "Organisation for online research",
            "logo": "org_01.jpg",
            "category": "Research",
            "shac_home_organisation": shac_home_organisation_00,
            "identifier": "f4585521-07f0-413c-9f70-ec9f7013b2a6"
        },
        {
            "name": "School 4 US",
            "short_name": "school4us",
            "description": "A school for everybody",
            "logo": "org_02.jpg",
            "category": "University",
            "shac_home_organisation": shac_home_organisation_01,
            "identifier": "fef3f1a3-f981-44f1-b31c-6b352e9d6826"
        }
    ]

    org_list = []
    for org in organisations:
        new_org = Organisation(
            name=org['name'],
            description=org['description'],
            identifier=org['identifier'],
            created_by="urn:admin",
            updated_by="urn:admin",
            short_name=org['short_name'],
            logo=read_image(org['logo'], directory="demo_images"),
            category=org['category']
        )
        persist_instance(db, new_org)
        org_list.append(new_org)

        new_sho = SchacHomeOrganisation(
            name=org['shac_home_organisation'],
            organisation=new_org,
            created_by="urn:admin",
            updated_by="urn:admin"
        )
        persist_instance(db, new_sho)

    # Create Users
    users = [
        {
            "username": "john",
            "name": "John Doe",
            "email": "john@example.org",
            "schac_home_organisation": shac_home_organisation_00,
            "org": org_list[0]
        },
        {
            "username": "peter",
            "name": "Peter Doe",
            "email": "john@example.org",
            "schac_home_organisation": shac_home_organisation_01,
            "org": org_list[1]
        }
    ]

    user_list = []
    for user in users:
        new_user = User(
            username=user['username'],
            uid=f"urn:{user['username']}",
            name=user['name'],
            email=f"{user['username']}@{user['schac_home_organisation']}",
            address="Postbus 1234AA",
            schac_home_organisation=user['schac_home_organisation']
        )
        persist_instance(db, new_user)
        user_list.append(new_user)

        # Add SSH keys
        ssh_key = SshKey(user=new_user, ssh_value="some-ssh-key")
        persist_instance(db, ssh_key)

        # Create organisation memberships
        org_membership_user = OrganisationMembership(
            role="admin",
            user=new_user,
            organisation=user['org']
        )
        persist_instance(db, org_membership_user)

    # Create Services
    services = [
        {
            "name": "Demo OIDC RP",
            "entity_id": "APP-18DE6298-7BDD-4CFA-9399-E1CC62E8DE05",
            "logo": "service_01.jpg",
            "mail": users[0]['email'],
            "allowed_organisations": [org_list[0], org_list[1]],
            "abbreviation": "svc01",
            "security_email": "sec@service_01.nl",
            "service_memberships": [user_list[0], user_list[1]]
        },
        {
            "name": "Demo SAML SP",
            "entity_id": "https://demo-sp.sram.surf.nl/saml/module.php/saml/sp/metadata.php/test",
            "logo": "service_02.jpg",
            "mail": users[1]['email'],
            "allowed_organisations": [org_list[0], org_list[1]],
            "abbreviation": "svc02",
            "security_email": "sec@service_02.nl",
            "service_memberships": user_list
        },
        {
            "name": "Mail",
            "entity_id": "service_entity_id_mail",
            "logo": "service_03.jpg",
            "mail": users[0]['email'],
            "allowed_organisations": org_list,
            "abbreviation": "svc03",
            "security_email": "sec@service_03.nl",
            "service_memberships": user_list
        },
        {
            "name": "Wireless",
            "entity_id": "service_entity_id_wireless",
            "logo": "service_04.jpg",
            "mail": users[0]['email'],
            "allowed_organisations": org_list,
            "abbreviation": "svc04",
            "security_email": "sec@service_04.nl",
            "service_memberships": user_list
        },
    ]

    service_list = []
    for service in services:
        new_service = Service(
            entity_id=service['entity_id'],
            name=service['name'],
            logo=read_image(service['logo'], directory="demo_images"),
            contact_email=service['mail'],
            override_access_allowed_all_connections=False,
            automatic_connection_allowed=True,
            allowed_organisations=service['allowed_organisations'],
            abbreviation=service['abbreviation'],
            accepted_user_policy="https://google.nl",
            privacy_policy="https://privacy.org",
            security_email=service['security_email']
        )
        persist_instance(db, new_service)
        service_list.append(new_service)

        # Add Service memberships
        for user in service['service_memberships']:
            service_membership_user = ServiceMembership(
                role="admin",
                user=user,
                service=new_service
            )

            persist_instance(db, service_membership_user)

        # Add service groups
        groups = [
            {
                "name": "Regular",
                "short_name": "regular",
                "auto_provision": True
            },
            {
                "name": "Admin",
                "short_name": "admin",
                "auto_provision": False
            },
        ]

        for group in groups:
            new_service_group = ServiceGroup(
                name=group['name'],
                short_name=group['short_name'],
                auto_provision_members=group['auto_provision'],
                description=f"{group['name']} users group",
                service=new_service
            )
            persist_instance(db, new_service_group)

    # Create Collaborations
    tags = [
        Tag(tag_value="label_01"),
        Tag(tag_value="label_02"),
    ]

    tag_list = []
    for tag in tags:
        persist_instance(db, tag)
        tag_list.append(tag)

    collaborations = [
        {
            "name": "AI Computing Group",
            "short_name": "collab01",
            "description": "Artifical Intelligence computing",
            "logo": "collab_01.jpg",
            "organisation": org_list[0],
            "services": [service_list[0], service_list[1]],
            "tags": [tag_list[0]],
            "users": [user_list[0], user_list[1]],
            "identifier": "e7f654c1-5ea8-4766-9d00-63cb029805bc"
        },
        {
            "name": "Genomics Group",
            "short_name": "collab02",
            "description": "Genomics computing",
            "logo": "collab_02.jpg",
            "organisation": org_list[1],
            "services": [service_list[0], service_list[1]],
            "tags": [tag_list[1]],
            "users": user_list,
            "identifier": "57b7e3bc-954f-4975-8748-89922aa3386a"
        },
    ]

    for collab in collaborations:
        new_collab = Collaboration(
            name=collab['name'],
            identifier=collab['identifier'],
            global_urn=f"ucc:{collab['short_name']}",
            description=collab['description'],
            logo=read_image(collab['logo'], directory="demo_images"),
            organisation=collab['organisation'],
            services=collab['services'],
            join_requests=[],
            invitations=[],
            tags=collab['tags'],
            short_name=collab['short_name'],
            website_url="https://www.google.nl",
            accepted_user_policy="https://www.google.nl",
            disclose_email_information=True,
            disclose_member_information=True
        )
        persist_instance(db, new_collab)

        # Make users member of collaboration
        membership_list = []
        for user in collab['users']:
            new_collab_membership = CollaborationMembership(
                role="member",
                user=user,
                collaboration=new_collab
            )
            persist_instance(db, new_collab_membership)
            membership_list.append(new_collab_membership)

        # Add collaboration groups
        groups = [
            {
                "name": "Student",
                "short_name": "students",
                "auto_provision": True,
                "identifier": str(uuid.uuid4())
            },
            {
                "name": "Teacher",
                "short_name": "teacher",
                "auto_provision": False,
                "identifier": str(uuid.uuid4())
            },
        ]

        for group in groups:
            new_group = Group(
                name=group['name'],
                short_name=group['short_name'],
                global_urn=f"uuc:{collab['short_name']}:{group['short_name']}",
                identifier=group['identifier'],
                auto_provision_members=group['auto_provision'],
                description=f"{group['name']} users group",
                collaboration=new_collab,
                collaboration_memberships=membership_list
            )
            persist_instance(db, new_group)

    db.session.commit()
