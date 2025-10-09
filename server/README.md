Sample CLI invocation:
```
$ FLASK_APP='__main__.py' flask stress-seed --help
INFO:main:Initialize server with profile local
INFO  [alembic.runtime.migration] Context impl MySQLImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
Usage: flask stress-seed [OPTIONS]

  Run stress seed with specified parameters

Options:
  -u, --users INTEGER      Number of users to create [default: 1000]
  -o, --orgs INTEGER       Number of organizations to create [default: 50]
  -c, --collab INTEGER     Number of collaborations to create [default: 200]
  -s, --services INTEGER   Number of services to create [default: 30]
  -g, --groups INTEGER     Number of groups to create [default: 5]
  -p, --probability FLOAT  Probability of users being member of a
                           collaboration and services being connected to a
                           collaboration  [default: 0.5]
  --help                   Show this message and exit.
  ```
