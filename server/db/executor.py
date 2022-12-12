from flask_executor import Executor


class BlockingExecutor():

    def submit(self, fn, *args, **kwargs):
        return fn(*args, **kwargs)


# The async flask executor does not log stack traces, for local testing purposes we use the BlockingExecutor
def init_executor(app, blocking=False):
    executor_ = Executor(app) if not blocking else BlockingExecutor()
    app.executor = executor_
    app.sync_executor = BlockingExecutor()
    return executor_
