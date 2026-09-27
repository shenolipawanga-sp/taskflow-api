// TaskFlow API: Build, Test, Code Quality, Security, Deploy, Release, Monitoring

def notifyTeam(String status) {
  try {
    emailext(
      to: env.ALERT_EMAIL_TO,
      subject: "[TaskFlow CI] ${status}: ${env.JOB_NAME} #${env.BUILD_NUMBER} (v${env.VERSION})",
      body: "Build ${env.BUILD_NUMBER} finished with status ${status}.\nVersion: ${env.VERSION}\nCommit: ${env.GIT_SHORT}\nDetails: ${env.BUILD_URL}",
      attachLog: status != 'SUCCESS'
    )
  } catch (err) {
    echo "Email notification skipped: ${err.message}"
  }
}

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
  }

  // Jenkins runs on localhost, so GitHub webhooks cannot reach it; poll instead
  triggers {
    pollSCM('H/2 * * * *')
  }

  environment {
    APP_NAME          = 'taskflow-api'
    VERSION           = "1.0.${BUILD_NUMBER}"
    SONAR_HOST_URL    = 'http://sonarqube:9000'     
    SONAR_PROJECT_KEY = 'taskflow-api'
    ALERT_EMAIL_TO    = 'shenoli.pawanga@gmail.com'    
    JWT_SECRET        = credentials('taskflow-jwt-secret')
  }

  stages {

    stage('Build') {
      steps {
        script {
          env.GIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        }
        echo "Building ${APP_NAME} version ${VERSION} from commit ${GIT_SHORT}"
        sh 'node --version && docker --version && docker compose version'
        sh 'npm ci --no-audit --no-fund'
        sh 'npm version "$VERSION" --no-git-tag-version --allow-same-version'
        sh '''
          docker build \
            --build-arg APP_VERSION="$VERSION" \
            --build-arg GIT_COMMIT="$GIT_SHORT" \
            -t "$APP_NAME:$VERSION" \
            -t "$APP_NAME:$GIT_SHORT" \
            -t "$APP_NAME:latest" .
        '''
        // Keep a copy of the exact image and a build record with the build
        sh '''
          mkdir -p dist
          docker save "$APP_NAME:$VERSION" | gzip > "dist/$APP_NAME-$VERSION.tar.gz"
          printf '{"version":"%s","commit":"%s","build":"%s","image":"%s:%s"}\n' \
            "$VERSION" "$GIT_SHORT" "$BUILD_NUMBER" "$APP_NAME" "$VERSION" > dist/build-info.json
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'dist/**', fingerprint: true
        }
      }
    }

    stage('Test') {
      steps {
        // Unit and integration suites run together; failures or coverage under the threshold fail the build
        sh 'npm run test:ci'
      }
      post {
        always {
          junit testResults: 'reports/junit/*.xml', allowEmptyResults: false
          archiveArtifacts artifacts: 'coverage/lcov-report/**', allowEmptyArchive: true
        }
      }
    }

    stage('Code Quality') {
      steps {
        sh 'mkdir -p reports'
        // Local gate: complexity, nesting, function length and parameter limits (see eslint.config.js)
        sh 'npm run lint'
        sh 'npm run lint:report'
        // Fail fast with a clear message if the SonarQube server is not running
        sh '''
          curl -sf "$SONAR_HOST_URL/api/system/status" | grep -q '"status":"UP"' \
            || { echo "SonarQube is not reachable at $SONAR_HOST_URL. Start it with: docker compose -f ci/sonarqube/docker-compose.yml up -d"; exit 1; }
        '''
        // Self-hosted SonarQube analysis; sonar.qualitygate.wait=true fails this step if the gate fails
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh '''
            npx --yes @sonar/scan \
              -Dsonar.host.url="$SONAR_HOST_URL" \
              -Dsonar.projectKey="$SONAR_PROJECT_KEY" \
              -Dsonar.projectVersion="$VERSION"
          '''
        }
        echo "SonarQube dashboard: http://localhost:9000/dashboard?id=${SONAR_PROJECT_KEY}"
      }
      post {
        always {
          archiveArtifacts artifacts: 'reports/eslint-report.json', allowEmptyArchive: true
        }
      }
    }

    stage('Security') {
      steps {
        sh 'sh scripts/security-scan.sh "$APP_NAME:$VERSION"'
      }
      post {
        always {
          archiveArtifacts artifacts: 'reports/security/**', allowEmptyArchive: true
        }
      }
    }

    stage('Deploy to Staging') {
      steps {
        // Compose up, wait for the health check, run the smoke test, roll back on failure
        sh 'sh scripts/deploy.sh staging "$VERSION"'
      }
    }

    stage('Release to Production') {
      steps {
        sh 'sh scripts/deploy.sh production "$VERSION"'
        sh 'docker tag "$APP_NAME:$VERSION" "$APP_NAME:stable"'
        withCredentials([usernamePassword(credentialsId: 'github-creds', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
          sh '''
            git config user.name "Jenkins CI"
            git config user.email "jenkins@taskflow.local"
            git tag -a "v$VERSION" -m "Release $VERSION (build $BUILD_NUMBER, commit $GIT_SHORT)"
            REPO=$(git config --get remote.origin.url | sed -e 's#^https://##' -e 's#^[^@]*@##')
            git push "https://$GH_USER:$GH_TOKEN@$REPO" "v$VERSION"
          '''
        }
        sh '''
          PREV_TAG=$(git describe --tags --abbrev=0 "v$VERSION^" 2>/dev/null || true)
          {
            echo "# TaskFlow API v$VERSION"
            echo
            echo "Build $BUILD_NUMBER, commit $GIT_SHORT, released $(date -u +%Y-%m-%dT%H:%MZ)"
            echo
            echo "## Changes"
            if [ -n "$PREV_TAG" ]; then git log --pretty='- %s (%h)' "$PREV_TAG..HEAD"; else git log --pretty='- %s (%h)' -10; fi
          } > dist/release-notes.md
          cat dist/release-notes.md
        '''
      }
      post {
        success {
          archiveArtifacts artifacts: 'dist/release-notes.md'
        }
      }
    }

    stage('Monitoring') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'alert-smtp', usernameVariable: 'SMTP_USER', passwordVariable: 'SMTP_PASS')]) {
          sh 'sh scripts/monitoring-up.sh'
        }
        sh 'sh scripts/verify-monitoring.sh'
      }
    }
  }

  post {
    success { script { notifyTeam('SUCCESS') } }
    failure { script { notifyTeam('FAILED') } }
    always  { sh 'docker image prune -f > /dev/null 2>&1 || true' }
  }
}
