import pytest
from unittest.mock import patch, MagicMock
from click.testing import CliRunner
from server.cli import register_commands
from flask import Flask


@pytest.fixture
def app():
    """Create a Flask app with registered CLI commands"""
    app = Flask(__name__)
    # Set up app with all necessary attributes
    app.app_config = MagicMock()
    app.app_config.stress_test = {
        'num_users': 100,
        'num_orgs': 20,
        'num_collaborations': 50,
        'num_services': 10,
        'num_groups': 30
    }

    # Create a proper DB mock (including session)
    db_mock = MagicMock()
    db_mock.session = MagicMock()
    app.db = db_mock

    # Register commands with the app
    register_commands(app)
    return app


@pytest.fixture
def runner(app):
    """Create a CLI runner for testing commands"""
    return CliRunner()


@patch('server.test.stress_seed.stress_seed')
def test_stress_seed_default_values(mock_stress_seed, app, runner):
    """Test stress-seed command with default values"""

    # Run command with the app context
    with app.app_context():
        result = runner.invoke(app.cli.commands['stress-seed'], [])

    print(f"Exit code: {result.exit_code}")
    print(f"Output: {result.output}")
    print(f"Exception: {result.exception}")

    assert result.exit_code == 0
    mock_stress_seed.assert_called_once()


@patch('server.test.stress_seed.stress_seed')
def test_stress_seed_custom_values(mock_stress_seed, app, runner):
    """Test stress-seed command with custom values"""

    with app.app_context():
        result = runner.invoke(app.cli.commands['stress-seed'], [
            '--users', '200',
            '--orgs', '30',
            '--collab', '100',
            '--services', '20',
            '--groups', '50'
        ])

    assert result.exit_code == 0
    mock_stress_seed.assert_called_once()


@patch('server.test.seed.seed')
def test_seed_command_normal(mock_seed, app, runner):
    """Test regular seed command"""

    with app.app_context():
        result = runner.invoke(app.cli.commands['seed'], [])

    assert result.exit_code == 0
    mock_seed.assert_called_once()


@patch('server.test.seed.seed')
def test_seed_command_with_skip(mock_seed, app, runner):
    """Test seed command with --skip flag"""

    with app.app_context():
        result = runner.invoke(app.cli.commands['seed'], ['--skip'])

    assert result.exit_code == 0
    mock_seed.assert_called_once()


@patch('server.test.seed.seed', side_effect=Exception("Seed error"))
def test_seed_error_handling(mock_seed, app, runner):
    """Test error handling in seed command"""

    with app.app_context():
        result = runner.invoke(app.cli.commands['seed'], [])

    assert result.exit_code == 0  # Commands should handle exceptions
    mock_seed.assert_called_once()


@patch('server.test.stress_seed.stress_seed', side_effect=Exception("Seed error"))
def test_stress_seed_error_handling(mock_stress_seed, app, runner):
    """Test error handling in stress-seed command"""
    with app.app_context():
        result = runner.invoke(app.cli.commands['stress-seed'], [])

    assert result.exit_code == 0  # Commands should handle exceptions
    mock_stress_seed.assert_called_once()


@patch('server.test.demo_seed.demo_seed')
def test_demo_seed_command(mock_demo_seed, app, runner):
    """Test demo-seed command"""

    with app.app_context():
        result = runner.invoke(app.cli.commands['demo-seed'], [])

    assert result.exit_code == 0
    mock_demo_seed.assert_called_once_with(app.db, app.app_config)


@patch('server.test.demo_seed.demo_seed', side_effect=Exception("Seed error"))
def test_demo_seed_error_handling(mock_demo_seed, app, runner):
    """Test error handling in demo-seed command"""
    with app.app_context():
        result = runner.invoke(app.cli.commands['demo-seed'], [])

    assert result.exit_code == 0  # Commands should handle exceptions
    mock_demo_seed.assert_called_once()


def test_cli_command_registration(app):
    """Test that all commands are properly registered"""
    assert 'seed' in app.cli.commands
    assert 'demo-seed' in app.cli.commands
    assert 'stress-seed' in app.cli.commands
