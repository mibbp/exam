#!/usr/bin/env python3
import argparse
import textwrap

import paramiko


def build_remote_script(base_url: str) -> str:
    return textwrap.dedent(
        f"""
        set -euo pipefail

        BASE_URL={base_url!r}
        REPO_MARKER='e2e-regression-repo'
        EXAM_MARKER='e2e-regression-exam'

        echo '--- login admin ---'
        ADMIN_JSON=$(curl -s "$BASE_URL/api/auth/login" \
          -X POST \
          -H 'Content-Type: application/json' \
          -d '{{"username":"admin","password":"Admin@123"}}')
        ADMIN_TOKEN=$(printf '%s' "$ADMIN_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

        echo '--- resolve or create repository ---'
        REPOS_JSON=$(curl -s "$BASE_URL/api/question-repositories?page=1&pageSize=200" -H "Authorization: Bearer $ADMIN_TOKEN")
        REPO_ID=$(printf '%s' "$REPOS_JSON" | python -c "import sys, json; data=json.load(sys.stdin); rows=data.get('rows', []); found=next((r for r in rows if r.get('description')=='$REPO_MARKER'), None); print(found.get('id') if found else '')")
        if [ -z "$REPO_ID" ]; then
          REPO_JSON=$(curl -s "$BASE_URL/api/question-repositories" \
            -X POST \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d '{{"name":"E2E Regression Repo","description":"e2e-regression-repo","category":"E2E","status":"ACTIVE"}}')
          REPO_ID=$(printf '%s' "$REPO_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['id'])")
        else
          curl -s "$BASE_URL/api/question-repositories/$REPO_ID" \
            -X PATCH \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d '{{"name":"E2E Regression Repo","description":"e2e-regression-repo","category":"E2E","status":"ACTIVE"}}' >/dev/null
        fi
        echo "repo_id=$REPO_ID"

        echo '--- resolve or create question ---'
        QUESTIONS_JSON=$(curl -s "$BASE_URL/api/questions?page=1&pageSize=500&keyword=E2E:%20Which%20status%20means%20success" -H "Authorization: Bearer $ADMIN_TOKEN")
        QUESTION_ID=$(printf '%s' "$QUESTIONS_JSON" | python -c "import sys, json; data=json.load(sys.stdin); rows=data.get('rows', []); found=next((q for q in rows if q.get('content')=='E2E: Which status means success?'), None); print(found.get('id') if found else '')")
        QUESTION_PAYLOAD=$(cat <<JSON
{{"repositoryId":$REPO_ID,"type":"SINGLE","content":"E2E: Which status means success?","options":["HTTP 200","HTTP 404","HTTP 500","HTTP 403"],"answer":"A","score":10,"difficulty":1,"analysis":"HTTP 200 means success.","tags":["E2E"],"knowledgePoints":["HTTP"],"source":"regression","status":"ACTIVE"}}
JSON
)
        if [ -z "$QUESTION_ID" ]; then
          QUESTION_JSON=$(curl -s "$BASE_URL/api/questions" \
            -X POST \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d "$QUESTION_PAYLOAD")
          QUESTION_ID=$(printf '%s' "$QUESTION_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['id'])")
        else
          curl -s "$BASE_URL/api/questions/$QUESTION_ID" \
            -X PATCH \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d "$QUESTION_PAYLOAD" >/dev/null
        fi
        echo "question_id=$QUESTION_ID"

        echo '--- resolve or create exam ---'
        EXAMS_JSON=$(curl -s "$BASE_URL/api/exams?page=1&pageSize=500" -H "Authorization: Bearer $ADMIN_TOKEN")
        EXAM_ID=$(printf '%s' "$EXAMS_JSON" | python -c "import sys, json; data=json.load(sys.stdin); rows=data.get('rows', []); found=next((e for e in rows if e.get('description')=='$EXAM_MARKER'), None); print(found.get('id') if found else '')")
        EXAM_PAYLOAD=$(cat <<JSON
{{"title":"E2E Regression Exam","description":"e2e-regression-exam","durationMinutes":10,"passScore":6,"maxAttempts":1,"openType":"PUBLIC","allowReview":true,"shuffleQuestions":false,"shuffleOptions":false,"antiCheatEnabled":true,"antiCheatThreshold":3,"showResultMode":"AFTER_SUBMIT","questionConfigs":[{{"questionId":$QUESTION_ID,"score":10}}]}}
JSON
)
        if [ -z "$EXAM_ID" ]; then
          EXAM_JSON=$(curl -s "$BASE_URL/api/exams" \
            -X POST \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d "$EXAM_PAYLOAD")
          EXAM_ID=$(printf '%s' "$EXAM_JSON" | python -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', ''))")
          if [ -z "$EXAM_ID" ]; then
            echo "Unexpected exam response: $EXAM_JSON"
            exit 1
          fi
        else
          curl -s "$BASE_URL/api/exams/$EXAM_ID" \
            -X PATCH \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H 'Content-Type: application/json' \
            -d "$EXAM_PAYLOAD" >/dev/null
        fi
        curl -s "$BASE_URL/api/exams/$EXAM_ID/publish" \
          -X POST \
          -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
        echo "exam_id=$EXAM_ID"

        echo '--- reset previous student attempt for regression exam ---'
        mysql -h 127.0.0.1 -P 13306 -uexam_user -pexam_pass exam_db -e "DELETE FROM ExamAttempt WHERE examId=$EXAM_ID AND userId=(SELECT id FROM User WHERE username='student');" >/dev/null

        echo '--- student start, answer, submit ---'
        STUDENT_JSON=$(curl -s "$BASE_URL/api/auth/login" \
          -X POST \
          -H 'Content-Type: application/json' \
          -d '{{"username":"student","password":"Student@123"}}')
        STUDENT_TOKEN=$(printf '%s' "$STUDENT_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
        ATTEMPT_BODY=$(printf '{{"examId":%s}}' "$EXAM_ID")
        ATTEMPT_JSON=$(curl -s "$BASE_URL/api/attempts/start" \
          -X POST \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -H 'Content-Type: application/json' \
          -d "$ATTEMPT_BODY")
        ATTEMPT_ID=$(printf '%s' "$ATTEMPT_JSON" | python -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', ''))")
        if [ -z "$ATTEMPT_ID" ]; then
          echo "Unexpected attempt response: $ATTEMPT_JSON"
          exit 1
        fi
        echo "attempt_id=$ATTEMPT_ID"

        curl -s "$BASE_URL/api/attempts/$ATTEMPT_ID/answers/$QUESTION_ID" \
          -X PATCH \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -H 'Content-Type: application/json' \
          -d '{{"answer":"A"}}' >/dev/null

        SUBMIT_JSON=$(curl -s "$BASE_URL/api/attempts/$ATTEMPT_ID/submit" \
          -X POST \
          -H "Authorization: Bearer $STUDENT_TOKEN")
        SCORE=$(printf '%s' "$SUBMIT_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['score'])")
        STATUS=$(printf '%s' "$SUBMIT_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['status'])")
        test "$SCORE" = "10" || (echo "Unexpected score: $SCORE" && exit 1)
        test "$STATUS" = "SUBMITTED" || (echo "Unexpected attempt status: $STATUS" && exit 1)

        echo '--- admin scoreboard ---'
        SCOREBOARD_JSON=$(curl -s "$BASE_URL/api/exams/$EXAM_ID/scoreboard?page=1&pageSize=20" \
          -H "Authorization: Bearer $ADMIN_TOKEN")
        TOTAL=$(printf '%s' "$SCOREBOARD_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['total'])")
        test "$TOTAL" = "1" || (echo "Unexpected scoreboard total: $TOTAL" && exit 1)

        echo '--- limited RBAC user ---'
        VIEWER_JSON=$(curl -s "$BASE_URL/api/auth/login" \
          -X POST \
          -H 'Content-Type: application/json' \
          -d '{{"username":"qa_viewer","password":"Viewer@123"}}')
        VIEWER_TOKEN=$(printf '%s' "$VIEWER_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
        DASH_CODE=$(curl -s -o /tmp/e2e-dashboard.json -w '%{{http_code}}' "$BASE_URL/api/dashboard/overview" -H "Authorization: Bearer $VIEWER_TOKEN")
        EXAMS_CODE=$(curl -s -o /tmp/e2e-exams.json -w '%{{http_code}}' "$BASE_URL/api/exams?page=1&pageSize=5" -H "Authorization: Bearer $VIEWER_TOKEN")
        test "$DASH_CODE" = "200" || (echo "Unexpected dashboard code: $DASH_CODE" && exit 1)
        test "$EXAMS_CODE" = "403" || (echo "Unexpected exams code: $EXAMS_CODE" && exit 1)

        echo 'E2E regression passed.'
        """
    ).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run live end-to-end regression checks on the exam server.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--base-url", default="http://127.0.0.1:18080")
    args = parser.parse_args()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(args.host, port=args.port, username=args.user, password=args.password, timeout=30)
    try:
        stdin, stdout, stderr = client.exec_command(build_remote_script(args.base_url), get_pty=True)
        out = stdout.read().decode("utf-8", "ignore")
        err = stderr.read().decode("utf-8", "ignore")
        print(out)
        if err:
            print("[stderr]")
            print(err)
        raise SystemExit(stdout.channel.recv_exit_status())
    finally:
        client.close()


if __name__ == "__main__":
    main()
