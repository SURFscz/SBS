# File: server/cli.py

import click
from flask.cli import with_appcontext


def register_commands(app):
    """Register Flask CLI commands"""

    @app.cli.command("stress-seed")
    @click.option("-u", "--users", default=1000,
                  help="Number of users to create")
    @click.option("-o", "--orgs", default=50,
                  help="Number of organizations to create")
    @click.option("-c", "--collab", default=200,
                  help="Number of collaborations to create")
    @click.option("-s", "--services", default=30,
                  help="Number of services to create")
    @click.option("-g", "--groups", default=5,
                  help="Number of groups to create")
    @click.option(
        "-p", "--probability",
        default=0.5,
        type=float,
        help="""
            Probability of users being member of a collaboration
            and services being connected to a collaboration
        """,
        show_default=True,
        callback=lambda ctx, param, value: (
            value if 0.0 <= value <= 1.0 else
            click.BadParameter("Probability must be between 0.0 and 1.0")
        )
    )
    @with_appcontext
    def run_stress_seed(users, orgs, collab, services, groups, probability):
        """Run stress seed with specified parameters"""
        from server.test.stress_seed import stress_seed

        config = {
            "num_users": users,
            "num_orgs": orgs,
            "num_collaborations": collab,
            "num_services": services,
            "num_groups": groups,
            "probability": probability,
        }

        # Update app_config with the stress test settings
        app.app_config.stress_test = config

        click.echo("Starting stress seed...")
        try:
            click.echo(f"config: {config}")
            stress_seed(app.db, app.app_config)
            click.echo("Stress seed completed successfully!")
        except Exception as e:
            click.echo(f"Error during stress seed: {str(e)}")

    @app.cli.command("seed")
    @click.option("--skip", is_flag=True, help="Skip seeding of test data")
    @with_appcontext
    def db_seed_command(skip):
        """Seed the database with test data"""
        from server.test.seed import seed

        click.echo("Running standard seed...")
        try:
            seed(app.db, app.app_config, skip)
            click.echo("Database has been seeded!")
        except Exception as e:
            click.echo(f"Error during seed: {str(e)}")

    @app.cli.command("demo-seed")
    @with_appcontext
    def demo_seed_command():
        """Seed the database with demo data for showcases"""
        from server.test.demo_seed import demo_seed

        click.echo("Running demo seed...")
        try:
            demo_seed(app.db, app.app_config)
            click.echo("Demo data seeded successfully!")
        except Exception as e:
            click.echo(f"Error during demo seed: {str(e)}")
