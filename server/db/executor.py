from flask_executor import Executor


class BlockingExecutor():

    def submit(self, fn, *args, **kwargs):
        return fn(*args, **kwargs)


# The async flask executor omits stack traces, for local testing and delete propagations we use the BlockingExecutor
def init_executor(app, blocking=False):
    executor_instance = Executor(app) if not blocking else BlockingExecutor()
    app.executor = executor_instance
    app.sync_executor = BlockingExecutor()
    return executor_instance
