import logging
from unittest import TestCase

from server.logger.traceback_info_filter import TracebackInfoFilter


class TestTracebackInfoFilter(TestCase):

    def test_filter_clear_exception(self):
        with self.assertLogs("test", level="INFO") as cm:
            logger = logging.getLogger("test")
            logger.addFilter(TracebackInfoFilter())
            logger.exception("msg")
            record = cm.records[0]
            self.assertIsNone(record.exc_info)
            self.assertIsNone(record.exc_text)

    def test_filter_debug_exception(self):
        with self.assertLogs("test", level="INFO") as cm:
            logger = logging.getLogger("test")
            logger.addFilter(TracebackInfoFilter(clear=False))
            logger.exception("msg")
            record = cm.records[0]
            self.assertIsNotNone(record.exc_info)
            self.assertIsNotNone(record.exc_text)
