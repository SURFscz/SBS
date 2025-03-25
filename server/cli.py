# File: server/cli.py

import click
from flask.cli import with_appcontext
from server.test.stress_seed import stress_seed
from server.db.db import db


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

        config = {
            "num_users": users,
            "num_orgs": orgs,
            "num_collaborations": collab,
            "num_services": services,
            "num_groups": groups,
        }

        click.echo("Starting stress seed...")

        app_config.stress_test = config

        # callback for CLI progress
        def cli_progress(step_name, count):
            click.echo(f"Processed {count} {step_name}")

        stress_seed(db, app_config, cli_progress)

        click.echo("Database has been seeded!")
