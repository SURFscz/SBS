import threading
import unittest

from server.scim.fifo_pool import FifoPool


class TestFifoPool(unittest.TestCase):

    def test_fifo_order_is_preserved_per_key(self):
        pool = FifoPool(max_workers=2)
        output = []
        done = threading.Event()

        def task(value):
            output.append(value)
            if value == 3:
                done.set()

        pool.submit("endpoint-a", task, 1)
        pool.submit("endpoint-a", task, 2)
        pool.submit("endpoint-a", task, 3)

        self.assertTrue(done.wait(timeout=2), "Timed out waiting for FIFO tasks")
        pool.shutdown(wait=True)
        self.assertEqual([1, 2, 3], output)

    def test_different_keys_can_run_in_parallel(self):
        pool = FifoPool(max_workers=2)
        started_a = threading.Event()
        started_b = threading.Event()
        release = threading.Event()
        execution_order = []

        def task_a():
            started_a.set()
            execution_order.append("a-start")
            self.assertTrue(release.wait(timeout=2), "Timed out waiting to release task_a")
            execution_order.append("a-end")

        def task_b():
            started_b.set()
            execution_order.append("b-start")
            self.assertTrue(release.wait(timeout=2), "Timed out waiting to release task_b")
            execution_order.append("b-end")

        pool.submit("endpoint-a", task_a)
        pool.submit("endpoint-b", task_b)

        self.assertTrue(started_a.wait(timeout=2), "task_a did not start")
        self.assertTrue(started_b.wait(timeout=2), "task_b did not start")

        release.set()
        pool.shutdown(wait=True)

        a_start = execution_order.index("a-start")
        b_start = execution_order.index("b-start")
        a_end = execution_order.index("a-end")
        b_end = execution_order.index("b-end")
        self.assertLess(max(a_start, b_start), min(a_end, b_end), execution_order)

    def test_exception_does_not_break_queue_for_same_key(self):
        pool = FifoPool(max_workers=1)
        output = []
        done = threading.Event()

        def failing():
            raise RuntimeError("boom")

        def succeeding():
            output.append("ok")
            done.set()

        future = pool.submit("endpoint-a", failing)
        pool.submit("endpoint-a", succeeding)

        with self.assertRaises(RuntimeError):
            future.result()
        self.assertTrue(done.wait(timeout=2), "Task after exception did not run")
        pool.shutdown(wait=True)
        self.assertEqual(["ok"], output)
