# SURF SamenwerkingsBeheerSysteem (SBS)

[![Build status](https://github.com/SURFscz/SBS/actions/workflows/main.yml/badge.svg)](https://github.com/SURFscz/SBS/actions)
[![Codecov](https://codecov.io/gh/SURFscz/SBS/branch/main/graph/badge.svg)](https://codecov.io/gh/SURFscz/SBS)

SURF Research Access Management (SRAM) Platform

### [Overview Requirements](#system-requirements)

-   Python >3.9
-   MySQL v5.7.x or MariaDB 10.x
-   Redis v6.x
-   Yarn 1.x
-   node 20+
-   libxmlsec1 (pre-1.3.0 see https://github.com/xmlsec/python-xmlsec/issues/254 and see
    https://github.com/xmlsec/python-xmlsec/issues/254#issuecomment-1511135314 for a workaround)

### [Getting started](#getting-started)

#### [Server](#server)

Create a virtual environment and install the required python packages:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r ./server/requirements/test.txt
```

Connect to your local mysql database: `mysql -u root` and create the SBS database and user:

```sql
DROP DATABASE IF EXISTS sbs;
CREATE DATABASE sbs CHARACTER SET utf8mb4 DEFAULT CHARACTER SET utf8mb4;
DROP DATABASE IF EXISTS sbs_test;
CREATE DATABASE sbs_test CHARACTER SET utf8mb4 DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'sbs'@'localhost' IDENTIFIED BY 'sbs';
GRANT ALL PRIVILEGES ON *.* TO 'sbs'@'localhost' WITH GRANT OPTION;
```

Create your own config.yaml by copying `server/config/test_config.yaml` and rename it to `config.yaml` (inside the same folder).

Make sure you point to the `sbs` database by changing the `database.uri` from `"mysql+mysqldb://sbs:sbs@127.0.0.1/sbs_test?charset=utf8mb4"` to `"mysql+mysqldb://sbs:sbs@127.0.0.1/sbs?charset=utf8mb4"`.

Run alembic on your sbs database by running `alembic -c migrations/alembic.ini upgrade head` inside the server (alembic points to the correct default, see `server/migrations/alembic.ini`).

Now you can start the server from the project root (so outside the server folder):

```bash
PROFILE=local ALLOW_MOCK_USER_API=1 CONFIG=config/config.yml python -m server
```

With TESTING=1 no mails will be sent. If you do want to validate the mails you can run a fake smtp server with:

```bash
python -m smtpd -n -c DebuggingServer localhost:1025
```

If you want the emails to be opened in the browser when developing add the `OPEN_MAIL_IN_BROWSER=1` to your environment.
Or even better, use https://mailpit.axllent.org/ and capture all emails send. You can see all mails delivered at
http://0.0.0.0:8025/ when you have the following configuration in you config file:

```yaml
mail:
    host: 0.0.0.0
    port: 1025
```

#### [Client](#client)

First install all dependencies with:

```bash
nvm use
yarn install
```

The GUI can be started with:

```bash
cd client
yarn start
```

To create a GUI production build:

```bash
yarn build
```

To analyze the bundle:

```bash
yarn analyze
```

### [API](#api)

See the [Swagger](https://test.sram.surf.nl/apidocs/) for the API documentation and data model.
Or for local development http://localhost:8080/apidocs/

You can use the Swagger interface for testing or cUrl using the command line:

```bash
curl -H "Accept: application/json" -H "Content-type: application/json" -H "Authorization: bearer {api_key}" "http://localhost:8080/api/organisations/v1" | jq .
curl -H "Accept: application/json" -H "Content-type: application/json" -H "Authorization: bearer {api_key}" "http://localhost:8080/api/collaborations/v1/{co_identifier}" | jq .
```

### [Performance](#performance)
When lazy loading other relationship data, the general rule-of-thumb leverages the best results:

Load child collections with `selectinload` and load single element relationships with `joinedload`.

### [Routes](#routes)

To see all routes:

```bash
source .venv/bin/activate
cd server
CONFIG='config/test_config.yml' FLASK_APP='__main__.py' flask routes
```

### [Testing](#testing)

To run the tests, you need a functioning Redis server on localhost:6379.
```bash
docker run -p 6379:6379 redis
```

To run all Python tests and validate syntax / formatting:

```bash
source .venv/bin/activate
cd server
pytest test
flake8 ./
```

To generate the coverage reports:

```bash
source .venv/bin/activate
cd server
pytest --cov=server --cov-report html:htmlcov test
open htmlcov/index.html
```

Within PyCharm you must mark the `SBS/server/test` directory as Test sources root in order to execute `conftest.py`
before tests are run. See:
https://intellij-support.jetbrains.com/hc/en-us/community/posts/12897247432338-PyCharm-unable-to-find-fixtures-in-conftest-py

If you are getting errors in Pycharm when debugging, then have a look at:
https://youtrack.jetbrains.com/issue/PY-51495/PyCharm-debug-fails-upon-import-asyncio

To run all JavaScript tests:

```bash
cd client
yarn test
```

Or to run all the tests and do not watch - like CI:

```bash
cd client
CI=true yarn test
```

With the environment variable `CONFIG=config/test_config.yml` the test database is used. After you ran one or all of the
tests the database is left with the test data seed. If you want to skip the login process when developing local then add
the following to your environment:
```bash
OPEN_MAIL_IN_BROWSER=1;PROFILE=local;CONFIG=config/test_config.yml;ALLOW_MOCK_USER_API=1
```

### [Deployment](#deployment)

See the https://github.com/SURFscz/SCZ-deploy project

### [Upgrade](#upgrade)

We just to use https://github.com/simion/pip-upgrader for upgrading automatically, however this library is not 
compatible with python 3.11+. We can use `pip-tools` as an alternative

```bash
source .venv/bin/activate
cd server
pip list --outdated
```

To automatically update all outdated packages:

```bash
pip install -U $(pip list --outdated | awk 'NR>2 {print $1}')
```

### [Dependency tree](#pipdeptree)

To list the dependency tree use the following commands:

```bash
source .venv/bin/activate
cd server
pipdeptree > pipdeptree.txt
cat pipdeptree.txt
```

### [flask](#flask)

To open a Flask terminal session:

```bash
source .venv/bin/activate
cd server
CONFIG='config/test_config.yml' FLASK_APP='__main__.py' flask shell
```
To run the stress-seed for performance testing:
```bash
source .venv/bin/activate
cd server
CONFIG='config/test_config.yml' FLASK_APP='__main__.py' flask stress-seed --help
```

### [PyCharm](#pycharm)

Because of eventlet the debugger in PyCharm sometimes crashes. Use the following environment properties to resolve this:

```
ALLOW_MOCK_USER_API=1;
CONFIG=config/acc_config.yml;
EVENTLET_HUB=poll;
PROFILE=local;
PYDEVD_USE_CYTHON=NO;
PYDEVD_USE_FRAME_EVAL=NO;
PYTHONUNBUFFERED=1
```

### [MySQL](#mysql)

When you encounter the following error after upgrading mySQL

```
E   ImportError: dlopen(/Users/okkeharsta/projects/SBS/.venv/lib/python3.9/site-packages/MySQLdb/_mysql.cpython-39-darwin.so, 0x0002): Library not loaded: /usr/local/opt/mysql/lib/libmysqlclient.23.dylib
```

then re-install the `mysqlclient` library with force

```
source .venv/bin/activate
pip uninstall mysqlclient
export MYSQLCLIENT_LDFLAGS=$(pkg-config --libs mysqlclient)
export MYSQLCLIENT_CFLAGS=$(pkg-config --cflags mysqlclient)
pip install mysqlclient --no-cache-dir
```

### [docker](#docker)

For localhost deployment you can make use of **docker**. You can take existing **docker-compose.yml** as your starting
point. The docker-compose file makes use of environment variables that you can adjust via a local **.env** file. To
create your own **.env** file, copy the provided **.env.example** file:

```bash
$ cp env.example .env
```
and edit the values to some sane values.

Now adjust the contents of this **.env** file to match your desired configuration.

Then build the docker images and launch the containers:

```bash
$ export DOCKER_DEFAULT_PLATFORM=linux/amd64
$ docker compose build
$ docker compose up -d
```

Now open your browser at: http://localhost:8080

## Client snapshot tests

Most of the components and pages in the client have basic snapshot tests (*.test.jsx). Snapshot tests are part of our CI
pipeline and are run in the build stage.

Whenever a page of component changes, the snapshot test of that page or component is expected to fail.
If the change was intended, the snapshot should be updated. In order to do that, one should delete the `__snapshots__` 
folder in the component's subfolder and rerun the test:

```bash
$ yarn test -- path/to/YourComponent.test.jsx -u
```
or

```bash
$ npm test -- path/to/YourComponent.test.jsx -u
```

This will create a new ``__snapshot__`` folder with an updated component snapshot. You can also run a script to 
regenerate everything:
```bash
$ cd client
$ nvm use
$ sh ./regenerate_snapshots.sh
```

