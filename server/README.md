Sample CLI invocation:
```
$ FLASK_APP='__main__.py' flask stress-seed --help
INFO:main:Initialize server with profile local
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
Usage: flask stress-seed [OPTIONS]

  Run stress seed with specified parameters

Options:
  -u, --users INTEGER      Number of users to create
  -o, --orgs INTEGER       Number of organizations to create
  -c, --collab INTEGER     Number of collaborations to create
  -s, --services INTEGER   Number of services to create
  -g, --groups INTEGER     Number of groups to create
  -p, --probability FLOAT  Probability of users being member of a
                           collaboration and services being connected to a
                           collaboration  [default: 0.5]
  --help                   Show this message and exit.
  ```
