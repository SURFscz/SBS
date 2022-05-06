# SURF SamenwerkingsBeheerSysteem (SBS)
[![Build status](https://github.com/SURFscz/SBS/actions/workflows/main.yml/badge.svg)](https://github.com/SURFscz/SBS/actions)
[![Codecov](https://codecov.io/gh/SURFscz/SBS/branch/main/graph/badge.svg)](https://codecov.io/gh/SURFscz/SBS)

SURF Research Access Management (SRAM) Platform

### [Overview Requirements](#system-requirements)

- Python 3.7.x
- MySQL v5.7.x or MariaDB 10.x
- Redis v6.x
- Yarn 1.x
- node
- libxmlsec1

### [Getting started](#getting-started)

#### [Server](#server)
Create a virtual environment and install the required python packages:
```
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r ./server/requirements/test.txt
```
Connect to your local mysql database: `mysql -uroot` and create the SBS database and user:

```sql
DROP DATABASE IF EXISTS sbs;
DROP DATABASE IF EXISTS sbs_test;
CREATE DATABASE sbs DEFAULT CHARACTER SET utf8mb4;
CREATE DATABASE sbs_test DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'sbs'@'localhost' IDENTIFIED BY 'sbs';
GRANT ALL PRIVILEGES ON *.* TO 'sbs'@'localhost' WITH GRANT OPTION;
```
Ensure MySQL is running and run the Python server with the correct local environment settings:
```
PROFILE=local CONFIG=config/test_config.yml python -m server
```
With TESTING=1 no mails will be send. If you do want to validate the mails you can run a fake smtp server with:
```
python -m smtpd -n -c DebuggingServer localhost:1025
```
If you want the emails to be opened in the browser when developing add the `OPEN_MAIL_IN_BROWSER=1` to your environment

#### [Client](#client)
First install all dependencies with:
```
yarn install
```
The GUI can be started with:
```
cd client
yarn start
```
To create a GUI production build:
```
yarn build
```
To analyze the bundle:
```
yarn analyze
```

### [API](#api)

See the [Swagger](https://test.sram.surf.nl/apidocs/) for the API documentation and data model.

To see all routes:
```
source .venv/bin/activate
cd server
CONFIG='config/test_config.yml' FLASK_APP='__main__.py' flask routes
```

### [Testing](#testing)

To run all Python tests and validate syntax / formatting:
```
pytest server/test
flake8 ./server/
```
To generate coverage reports:
```
pytest --cov=server --cov-report html:htmlcov server/test
open htmlcov/index.html
```
To run all JavaScript tests:
```
cd client
yarn test
```
Or to run all the tests and do not watch - like CI:
```
cd client
CI=true yarn test
```
With the environment variable `CONFIG=config/test_config.yml` the test database is used. After you ran one or all of the tests
the database is left with the test data seed. If you want to skip the login process when developing local then add the following to your
environment: OPEN_MAIL_IN_BROWSER=1;PROFILE=local;CONFIG=config/test_config.yml;ALLOW_MOCK_USER_API=1

### [Deployment](#deployment)

See the https://github.com/SURFscz/SCZ-deploy project

### [Upgrade](#upgrade)

See https://github.com/simion/pip-upgrader for upgrading automatically

### [Swagger](#swagger)

See http://localhost:8080/apidocs/ and https://test.sram.surf.nl/apidocs/

### [SURFSecureID](#surfsecureid)

See the /config/saml_test configuration and the https://github.com/SURFscz/SCZ-deploy project

### [flash](#flash)

To open a flash terminal session:
```
source .venv/bin/activate
cd server
CONFIG='config/test_config.yml' FLASK_APP='__main__.py' flask shell
```
