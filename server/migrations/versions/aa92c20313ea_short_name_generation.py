"""short_name generation

Revision ID: aa92c20313ea
Revises: 7abfb528d0c1
Create Date: 2019-09-11 16:01:37.119914

"""

# revision identifiers, used by Alembic.


from alembic import op
from sqlalchemy import text

revision = 'aa92c20313ea'
down_revision = '7abfb528d0c1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE users RENAME COLUMN short_name TO username"))

    from server.api.user import generate_unique_username
    from server.db.db import User, db
    from server.__main__ import app

    with app.app_context():
        users = User.query.filter(User.username == None).all()  # noqa: E711
        for user in users:
            user.username = generate_unique_username(user)
            db.session.merge(user)
            db.session.commit()


def downgrade():
    pass
