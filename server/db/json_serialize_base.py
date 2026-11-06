from sqlalchemy import inspect
from sqlalchemy.orm.exc import DetachedInstanceError


class JsonSerializableBase(object):

    def __json__(self):
        inspection = inspect(self)

        columns = set(inspection.mapper.column_attrs.keys())
        relationships = set(inspection.mapper.relationships.keys())
        unloaded = inspection.unloaded
        expired = inspection.expired_attributes

        keys = columns.union(relationships)
        if not inspection.transient:
            keys.difference_update(unloaded)

        if inspection.expired:
            keys.update(expired)

        if inspection.deleted or inspection.detached:
            keys.difference_update(relationships)
            keys.difference_update(unloaded)

        # Legacy columns are mapped to a private attribute and replaced by a runtime derived property
        keys = {key for key in keys if not key.startswith("_")}
        res = {key: getattr(self, key) for key in keys}
        for name in getattr(self, "json_properties", ()):
            try:
                res[name] = getattr(self, name)
            except (DetachedInstanceError, AttributeError):
                pass
        return res
