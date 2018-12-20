# SBS
[![Build Status](https://travis-ci.org/SURFscz/SBS.svg)](https://travis-ci.org/SURFscz/SBS)
[![codecov.io](https://codecov.io/github/SURFscz/SBS/coverage.svg)](https://codecov.io/github/SURFscz/SBS)

Samenwerking Beheer Systeem ↣ Collaboration Management System

### [Overview Requirements](#system-requirements)

- Python 3.7.x
- MySQL v8.x
- Yarn 1.x
- node

### [Getting started](#getting-started)

Create a virtual environment and install the required python packages:
```
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r ./requirements/test.txt
```
Connect to your local mysql database: `mysql -uroot` and create the SBS database and user:

```sql
CREATE DATABASE sbs DEFAULT CHARACTER SET utf8;
CREATE DATABASE sbs_test DEFAULT CHARACTER SET utf8;
CREATE USER 'sbs'@'localhost' IDENTIFIED BY 'sbs';
GRANT ALL PRIVILEGES ON *.* TO 'sbs'@'localhost' WITH GRANT OPTION;
```
Ensure MySQL is running and run the Python server:
```
PROFILE=local python -m server
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

See the [Wiki](https://github.com/SURFscz/SBS/wiki) for the API documentation.

### [Testing](#testing)

To run all Python tests:
```
pytest server/test
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
Or to run all the tests and do not watch:
```
cd client
CI=true yarn test
```
 
