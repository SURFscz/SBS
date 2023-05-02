from sqlalchemy import inspect


class JsonSerializableBase(object):

    def __json__(self):
        inspection = inspect(self)

        columns = set(inspection.mapper.column_attrs.keys())
        relationships = set(inspection.mapper.relationships.keys())
        unloaded = inspection.unloaded
        expired = inspection.expired_attributes

        keys = columns | relationships
        if not inspection.transient:
            keys.difference_update(unloaded)

        if inspection.expired:
            keys.update(expired)

        if inspection.deleted or inspection.detached:
            keys.difference_update(relationships)
            keys.difference_update(unloaded)

        return {key: getattr(self, key) for key in keys}
