from flask import current_app

from server.db.executor import init_executor
from server.test.abstract_test import AbstractTest


class TestExecutor(AbstractTest):

    def test_blocking_executor(self):
        def fn(a: int, b: int):
            return a + b

        executor = init_executor(current_app, True)
        self.assertEqual(5, executor.submit(fn, 2, 3))

        executor = init_executor(current_app)
        self.assertEqual(5, executor.submit(fn, 2, 3).result())
