# Web-Based Collaborative IDE

A real-time collaborative IDE that runs in the browser. Users can create projects, manage project members, edit code together with live cursor presence, compile and run C/C++ programs.

## Setup

```bash
cp backend/.env.template backend/.env
cp backend/.env.docker.template backend/.env.docker
cp frontend/.env.template frontend/.env
# Fill in the values in the .env files
npm run docker:all
```

The application will be available at `localhost`.

## Local Development

First, add the env files like in normal setup.

For frontend development, backend can still be be run in Docker:

```bash
npm run docker:backend
npm --prefix frontend install
npm run dev:frontend
```

The application will be available at `localhost:5173`.

For backend development, database services can be run in Docker and the server / worker can be run locally.

```bash
npm --prefix backend run docker:db
npm --prefix backend run start:server
npm --prefix backend run start:worker
```

## Testing

Frontend tests have no external dependencies:

```bash
npm run test:frontend
```

Backend tests require a running database:

```bash
npm --prefix backend run docker:db
npm run test:backend
```

## Backend

The code is a fork of [y/hub](https://github.com/yjs/yhub) — a scalable [y-websocket](https://github.com/yjs/y-websocket)-compatible backend.

For more specific implementation details visit the original repository.

### App REST API

| Method           | Path                                | Description                      |
| ---------------- | ----------------------------------- | -------------------------------- |
| POST             | `/api/auth/register`                | Create an account                |
| POST             | `/api/auth/login`                   | Authenticate and receive a JWT   |
| GET              | `/api/auth/me`                      | Get the current user's profile   |
| GET/POST         | `/api/projects`                     | List / create projects           |
| GET/PATCH/DELETE | `/api/projects/:id`                 | Get, update, or delete a project |
| POST/DELETE      | `/api/projects/:id/members/:userId` | Manage project membership        |
| PUT/DELETE       | `/api/projects/:id/favorite`        | Star / unstar a project          |

### Y/hub API

| Method | Path                     | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| WS     | `/ws/:org/:docid`        | Yjs sync (y-websocket compatible)        |
| GET    | `/ydoc/:org/:docid`      | Download the current Yjs document state  |
| PATCH  | `/ydoc/:org/:docid`      | Apply an update to a Yjs document        |
| POST   | `/rollback/:org/:docid`  | Roll back a document to a previous state |
| GET    | `/changeset/:org/:docid` | List changesets (history) for a document |
| GET    | `/activity/:org/:docid`  | Get recent activity for a document       |

## License

AGPL-3.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.
