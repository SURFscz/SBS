from flask_executor import Executor


def init_executor(app):
    return Executor(app)
