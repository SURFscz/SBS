# E2E Tests mocked

## Intro
Local component tests.

## Quick Start

### Setup
```bash
yarn install
```

### Run
First run the frontend and backend (seeded test DB, `ALLOW_MOCK_USER_API=1`).
```bash
cd ../client
yarn dev
```
Then run the tests.
```bash
yarn test
```
Or
```bash
yarn test:ui
```
