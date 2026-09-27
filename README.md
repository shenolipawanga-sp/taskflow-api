# TaskFlow API

TaskFlow is a small task management REST API written in Node.js and Express. Users register, log in with a JWT, and manage their own tasks (create, list, filter, update, delete, and view summary stats). It also exposes health, readiness and Prometheus metrics endpoints so it can be deployed and monitored properly.

It was built for the SIT223/SIT753 High Distinction task, so the repository also contains everything needed to take it through a seven-stage Jenkins pipeline: Build, Test, Code Quality, Security, Deploy, Release and Monitoring.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | Liveness, version and environment |
| GET | `/ready` | no | Readiness of the data layer |
| GET | `/metrics` | no | Prometheus metrics |
| POST | `/api/auth/register` | no | Create an account |
| POST | `/api/auth/login` | no | Get a bearer token |
| GET | `/api/tasks?status=&priority=` | yes | List your tasks, optionally filtered |
| POST | `/api/tasks` | yes | Create a task |
| GET | `/api/tasks/stats` | yes | Counts by status plus overdue tasks |
| GET / PATCH / DELETE | `/api/tasks/:id` | yes | Read, update or delete one task |

Tasks have `title`, `description`, `status` (todo, in_progress, done), `priority` (low, medium, high) and an optional `dueDate`.

## Running it locally

```bash
npm install
npm test            # unit + integration tests
npm run lint        # maintainability rules
npm start           # http://localhost:3000
```

## Pipeline overview

| Stage | What happens | Tools |
|---|---|---|
| Build | `npm ci`, version stamped as `1.0.<build>`, Docker image tagged with version, commit and `latest`, image archived | npm, Docker |
| Test | 55 unit and integration tests, JUnit results published, build fails under the coverage threshold | Jest, Supertest, jest-junit |
| Code Quality | ESLint complexity/length gate, then SonarQube analysis against a custom quality gate | ESLint, SonarQube Community Build (Docker) |
| Security | npm audit (fails on high/critical), Trivy image scan for CVEs and secrets, severity summary | npm audit, Trivy |
| Deploy to Staging | Compose deploy on port 3001, health check, smoke test, automatic rollback | Docker Compose |
| Release to Production | Same checks on port 3000 with production config, Git tag `v1.0.<build>` pushed, release notes | Docker Compose, Git |
| Monitoring | Prometheus, Alertmanager and Grafana deployed and verified, alert rules loaded, email alerts | Prometheus, Alertmanager, Grafana |

## Setting up Jenkins

The pipeline needs Docker, Docker Compose and Node inside Jenkins. `ci/jenkins/Dockerfile` builds a Jenkins image with all of these.

From the repository root (PowerShell or a terminal):

```bash
docker build -t taskflow-jenkins ci/jenkins

docker stop jenkins
docker rm jenkins

docker compose -f ci/sonarqube/docker-compose.yml up -d

docker run -d --name jenkins -u root --restart unless-stopped --network taskflow-ci-net -p 8083:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock taskflow-jenkins
```

SonarQube is started first because it creates the `taskflow-ci-net` network that Jenkins joins, which is how the pipeline reaches it at `http://sonarqube:9000`.

Reusing the `jenkins_home` volume keeps your existing jobs, users and credentials. Check it worked with `docker exec jenkins docker ps`.

### Credentials

Add these in Manage Jenkins > Credentials > System > Global credentials:

| ID | Kind | Value |
|---|---|---|
| `github-creds` | Username with password | GitHub username and a personal access token with repo scope |
| `sonar-token` | Secret text | User token from SonarQube (My Account > Security) |
| `taskflow-jwt-secret` | Secret text | Any long random string |
| `alert-smtp` | Username with password | Gmail address and a Gmail app password |

### SonarQube

Open http://localhost:9000, log in as admin / admin and set a new password. Create a user token under My Account > Security and store it as the `sonar-token` credential. Then create a quality gate called "TaskFlow Gate" under Quality Gates with these conditions on overall code: coverage below 80% fails, duplicated lines above 3% fails, and maintainability, reliability and security ratings worse than A fail. Set it as the default gate. The project itself is created automatically the first time the pipeline runs.

### The job

New Item > Pipeline. Under Pipeline choose "Pipeline script from SCM", Git, this repository URL, credentials `github-creds`, branch `*/main`, script path `Jenkinsfile`. Save and click Build Now once so Jenkins picks up the polling trigger. After that, every push to `main` starts a build within two minutes.

## Where things run

| Service | URL |
|---|---|
| Jenkins | http://localhost:8083 |
| SonarQube | http://localhost:9000 |
| Staging API | http://localhost:3001 |
| Production API | http://localhost:3000 |
| Prometheus (alerts under /alerts) | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Grafana (admin / admin) | http://localhost:3300 |

## Monitoring and the incident drill

Prometheus scrapes the production container every 10 seconds. Four alert rules are defined in `monitoring/prometheus/alert.rules.yml`: API down, 5xx error ratio above 5%, p95 latency above 500 ms, and memory above 200 MB. Alertmanager emails the team for each one and sends a follow-up when it resolves.

To give the dashboard some traffic:

```bash
docker exec taskflow-prod node scripts/generate-traffic.js http://localhost:3000 120
```

To simulate an outage (stops production for 90 seconds, which fires `TaskflowApiDown` and sends an email):

```bash
sh scripts/simulate-incident.sh 90
```

On Windows without Git Bash, run `docker stop taskflow-prod`, wait about a minute and a half, then `docker start taskflow-prod`.

## Repository layout

```
src/                 application code (routes, services, middleware, store)
tests/unit/          unit tests
tests/integration/   API tests through Supertest
scripts/             deploy, rollback, smoke test, security scan and monitoring scripts
config/              staging and production settings
deploy/              Docker Compose files for staging and production
monitoring/          Prometheus, Alertmanager and Grafana images and config
ci/jenkins/          Jenkins image with Docker, Compose and Node
ci/sonarqube/        self-hosted SonarQube for the Code Quality stage
Jenkinsfile          the pipeline
```

## Known limitations

Data is held in memory, so it resets when a container restarts. The store sits behind a small interface in `src/store/memoryStore.js`, so a database could replace it without touching the services. Staging, production and monitoring all share one Docker host, which is fine for a lab but not how production would be separated in practice.
pipeline