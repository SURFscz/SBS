import datetime
import uuid
import logging

from random import choice, randint, sample

from faker import Faker

from server.db.domain import (User,
                              Organisation,
                              Collaboration,
                              Service,
                              OrganisationMembership,
                              CollaborationMembership,
                              ServiceMembership,
                              Group)
from server.tools import dt_now
from .seed import persist_instance, clean_db, read_image

fake = Faker()
logger = logging.getLogger()


def stress_seed(db, app_config):
    """
    Populate the database with a large number of entities for stress testing.
    The number of entities is controlled by parameters in config.yml.
    """

    def batch(db, items, batch_size=50):
        """
        Persist items in batches to avoid memory issues.
        """
        for i in range(0, len(items), batch_size):
            persist_instance(db, *items[i:i + batch_size])
            db.session.commit()

    logger.debug("Running stress seed...")

    clean_db(db)

    # Get stress test parameters from config
    stress_config = getattr(app_config, 'stress_test', {})
    num_users = stress_config.get('num_users', 1000)
    num_orgs = stress_config.get('num_orgs', 50)
    num_collaborations = stress_config.get('num_collaborations', 200)
    num_services = stress_config.get('num_services', 30)
    num_groups = stress_config.get('num_groups', 5)
    probability = stress_config.get('probability', 0.5)
              
    logger.debug(
        f"Starting stress seed with: {num_users} users, {num_orgs} orgs, {num_services} services, "
        f"{num_collaborations} collaborations, {num_groups} groups"
    )

    # Create some seed users for admin purposes
    admin = User(uid="urn:john", name="The Boss", email="boss@example.org", username="admin",
                 external_id="e906cf88-cdb3-480d-8bb3-ce53bdcda4e7",
                 created_by="urn:admin", updated_by="urn:admin",
                 last_login_date=dt_now() - datetime.timedelta(days=1))
    persist_instance(db, admin)

    # Create a set of images to use
    images = [
        read_image("computing.png"),
        read_image("email.png"),
        read_image("cloud.png"),
        read_image("network.png"),
        read_image("storage.png"),
        read_image("teachers.png"),
        read_image("wiki.png"),
        read_image("wireless.png"),
        read_image("research.png"),
        read_image("test.png"),
    ]

    # Create users
    logger.debug(f"Creating {num_users} users...")
    users = [admin]  # Start with admin user
    for i in range(num_users):
        name = fake.name()
        username = fake.user_name() + str(i)
        email = f"{username}@example.org"
        user = User(
            uid=f"urn:{username}",
            name=name,
            email=email,
            username=username,
            external_id=str(uuid.uuid4()),
            last_login_date=dt_now() - datetime.timedelta(days=randint(0, 90)),
            created_by="urn:admin",
            updated_by="urn:admin"
        )
        users.append(user)

    batch(db, users, 100)
    logger.info(f"Created {len(users)} users")

    # Create organisations
    logger.debug(f"Creating {num_orgs} organisations...")
    orgs = []
    for i in range(num_orgs):
        name = fake.company()
        short_name = short_name = f"org_{i}"
        org = Organisation(
            name=name,
            short_name=short_name,
            identifier=str(uuid.uuid4()),
            description=fake.catch_phrase(),
            logo=choice(images),
            created_by="urn:admin",
            updated_by="urn:admin",
            category=choice(["Research", "University", "UMC", "Overig"]),
            accepted_user_policy=f"https://{short_name}.example.org/aup"
        )
        logger.debug(f"-- Creating organisation {name} with short_name {short_name}")

        orgs.append(org)

    batch(db, orgs, 20)
    logger.info(f"Created {len(orgs)} organisations")

    logger.debug("Creating organisation memberships...")
    org_memberships = []

    for org in orgs:
        # Add 3-15 random members to each organisation
        num_org_members = randint(3, 15)
        org_members = sample(users, min(num_org_members, len(users)))

        for user in org_members:
            # 1/3 chance to be admin, 2/3 chance to be manager
            role = "admin" if randint(1, 3) == 1 else "manager"
            membership = OrganisationMembership(
                role=role,
                user=user,
                organisation=org,
                created_by="urn:admin",
                updated_by="urn:admin"
            )
            org_memberships.append(membership)

    batch(db, org_memberships, 50)
    logger.info(f"Created {len(org_memberships)} organisation memberships")

    # Create services
    logger.debug(f"Creating {num_services} services...")
    services = []
    for i in range(num_services):
        name = fake.bs()
        entity_id = f"https://{name.lower().replace(' ', '-')}-{i}"
        logger.debug(f"-- Creating service {name} with entity_id {entity_id}")
        service = Service(
            entity_id=entity_id,
            name=name,
            description=fake.paragraph(),
            logo=choice(images),
            contact_email=fake.email(),
            override_access_allowed_all_connections=False,
            automatic_connection_allowed=choice([True, False]),
            accepted_user_policy=f"https://policy.example.org/{i}",
            abbreviation=name[:5].lower() + str(i),
            allowed_organisations=sample(orgs, min(randint(1, 10), len(orgs))),
            privacy_policy=f"https://privacy.example.org/{i}",
            security_email=fake.email(),
            created_by="urn:admin",
            updated_by="urn:admin"
        )
        logger.debug(
            f"-- Creating service {name} with entity_id {entity_id}"
            f" and {len(service.allowed_organisations)} allowed organisations"
        )

        services.append(service)

    batch(db, services, 50)
    logger.info(f"Created {len(services)} services")

    logger.debug("Creating service memberships...")
    service_memberships = []

    for service in services:
        # Add 2-10 random members to each service
        num_service_members = randint(2, 10)
        service_members = sample(users, min(num_service_members, len(users)))

        for user in service_members:
            # 1/3 chance to be admin, 2/3 chance to be manager
            role = "admin" if randint(1, 3) == 1 else "manager"
            membership = ServiceMembership(
                role=role,
                user=user,
                service=service,
                created_by="urn:admin",
                updated_by="urn:admin"
            )
            service_memberships.append(membership)

    batch(db, service_memberships, 50)
    logger.info(f"Created {len(service_memberships)} service memberships")

    # Create collaborations in batches to avoid memory issues
    logger.debug(f"Creating {num_collaborations} collaborations...")

    collaborations = []

    for i in range(num_collaborations):
        name = f"{fake.catch_phrase()}"
        short_name = f"collab_{i}"
        org = choice(orgs)
        collaboration = Collaboration(
            name=name,
            short_name=short_name,
            global_urn=f"{org.short_name}:{short_name}",
            identifier=str(uuid.uuid4()),
            description=fake.paragraph(),
            logo=choice(images),
            organisation=org,
            services=sample(services, int(len(services) * probability)),
            website_url=fake.url(),
            accepted_user_policy=f"https://policy.example.org/collab_{i}",
            disclose_email_information=choice([True, False]),
            disclose_member_information=choice([True, False]),
            created_by="urn:admin",
            updated_by="urn:admin"
        )
        logger.debug(
            f"-- Creating collaboration {name} with short_name {short_name}"
            f" for organisation {org.name}"
            f" with {len(collaboration.services)} services"
        )

        collaborations.append(collaboration)

    batch(db, collaborations, 50)
    logger.info(f"Created {len(collaborations)} collaborations")

    # Create collaboration memberships
    for collab in collaborations:
        collab_memberships = []
        # Add random members to each collaboration
        members = sample(users, int(len(users) * probability))

        # Make one user an admin
        admin_membership = CollaborationMembership(
            role="admin",
            user=members[0],
            collaboration=collab,
            created_by="urn:admin",
            updated_by="urn:admin"
        )
        collab_memberships.append(admin_membership)

        # Make the rest regular members
        for user in members[1:]:
            member = CollaborationMembership(
                role="member",
                user=user,
                collaboration=collab,
                created_by="urn:admin",
                updated_by="urn:admin"
            )
            collab_memberships.append(member)

        batch(db, collab_memberships, 50)
        logger.info(f"meberships for collaboration: {collab.global_urn}: {len(collab_memberships)}")

        # Create groups for this collaboration
        groups = []
        for i in range(randint(0, num_groups)):
            name = f"{fake.word()}"
            short_name = f"group_{i}"

            # Get admin memberships for this collaboration
            admin_members = [m for m in collab_memberships if m.collaboration == collab and m.role == "admin"]

            if admin_members:
                group = Group(
                    name=name,
                    short_name=short_name,
                    global_urn=f"{collab.organisation.short_name}:{collab.short_name}:{short_name}",
                    identifier=str(uuid.uuid4()),
                    auto_provision_members=choice([True, False]),
                    description=fake.sentence(),
                    collaboration=collab,
                    collaboration_memberships=sample(
                        collab_memberships,
                        min(randint(1, 10), len(collab_memberships))
                    ),
                    created_by="urn:admin",
                    updated_by="urn:admin"

                )
                logger.debug(
                    f"-- Creating group {name} with short_name {short_name}"
                    f" for collaboration {collab.name}"
                    f" with {len(group.collaboration_memberships)} members"
                )

                groups.append(group)

        batch(db, groups, 50)
        logger.info(f"Created {len(groups)} groups for collaboration {collab.global_urn}")

    logger.debug("Stress seed completed successfully")
