from datetime import datetime

from server.db.db import db
from server.db.domain import Collaboration


def update_last_activity_date(collaboration_id):
    collaboration = db.session.get(Collaboration, collaboration_id)
    collaboration.last_activity_date = datetime.now()
    db.session.merge(collaboration)
