# make sure we monkey_patch right at the start, before other imports
# see https://github.com/miguelgrinberg/Flask-SocketIO/issues/806
# and https://github.com/eventlet/eventlet/issues/896
import eventlet
eventlet.monkey_patch()
