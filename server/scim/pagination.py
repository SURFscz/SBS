from werkzeug.exceptions import BadRequest


def parse_pagination_params(start_index_param, count_param):
    try:
        start_index = 1 if start_index_param is None else int(start_index_param)
    except (TypeError, ValueError):
        raise BadRequest("startIndex must be an integer")
    if start_index < 1:
        raise BadRequest("startIndex must be greater than or equal to 1")

    count = None
    if count_param is not None:
        try:
            count = int(count_param)
        except (TypeError, ValueError):
            raise BadRequest("count must be an integer")
        if count < 0:
            raise BadRequest("count must be greater than or equal to 0")

    return start_index, count


def paginate_items(items, start_index, count):
    total = len(items)
    offset = start_index - 1
    if offset >= total:
        page = []
    elif count is None:
        page = items[offset:]
    else:
        page = items[offset:offset + count]
    return page, total, len(page)
