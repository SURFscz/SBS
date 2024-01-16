from server.db.db import db
from server.db.domain import Collaboration
from server.tools import dt_now


def update_last_activity_date(collaboration_id):
    collaboration = db.session.get(Collaboration, collaboration_id)
    collaboration.last_activity_date = dt_now()
    db.session.merge(collaboration)
