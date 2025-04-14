# File: server/cli.py

import click
from flask.cli import with_appcontext


def register_commands(app):
    """Register Flask CLI commands"""

    app_config = app.app_config

    stress_config = getattr(app_config, 'stress_test', {})
    num_users = stress_config.get('num_users', 1000)
    num_orgs = stress_config.get('num_orgs', 50)
    num_collaborations = stress_config.get('num_collaborations', 200)
    num_services = stress_config.get('num_services', 30)
    num_groups = stress_config.get('num_groups', 5)

    @app.cli.command("stress-seed")
    @click.option("--users", default=num_users,
                  help="Number of users to create")
    @click.option("--orgs", default=num_orgs,
                  help="Number of organizations to create")
    @click.option("--collab", default=num_collaborations,
                  help="Number of collaborations to create")
    @click.option("--services", default=num_services,
                  help="Number of services to create")
    @click.option("--groups", default=num_groups,
                  help="Number of groups to create")
    @with_appcontext
    def run_stress_seed(users, orgs, collab, services, groups):
        """Run stress seed with specified parameters"""
        from server.db import db
        from server.test.stress_seed import stress_seed

        config = {
            "num_users": users,
            "num_orgs": orgs,
            "num_collaborations": collab,
            "num_services": services,
            "num_groups": groups,
        }

        # Update app_config with the stress test settings
        app.app_config.stress_test = config

        click.echo("Starting stress seed...")
        try:
            click.echo(f"config: {config}")
            stress_seed(db.session, app.app_config)
            click.echo("Stress seed completed successfully!")
        except Exception as e:
            click.echo(f"Error during stress seed: {str(e)}")

    @app.cli.command("seed")
    @click.option("--skip", is_flag=True, help="Skip seeding of test data")
    @with_appcontext
    def db_seed_command(skip):
        """Seed the database with test data"""
        from server.db import db
        from server.test.seed import seed

        click.echo("Running standard seed...")
        try:
            seed(db.session, app.app_config, skip)
            click.echo("Database has been seeded!")
        except Exception as e:
            click.echo(f"Error during seed: {str(e)}")

    @app.cli.command("demo-seed")
    @with_appcontext
    def demo_seed_command():
        """Seed the database with demo data for showcases"""
        from server.db import db
        from server.test.demo_seed import demo_seed

        click.echo("Running demo seed...")
        try:
            demo_seed(db.session, app.app_config)
            click.echo("Demo data seeded successfully!")
        except Exception as e:
            click.echo(f"Error during demo seed: {str(e)}")
