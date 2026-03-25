import http from 'k6/http'
import { check, sleep } from 'k6'

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJlMmQ0OWQwMjcxYTZhNzBjMzMxZDciLCJlbWFpbCI6InJhaHVsQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc0MDk0MDYzLCJleHAiOjE3NzQxODA0NjN9.zgFz6hoQF85cVDcyb1gnWpnBidbRsGTL1Ul5pxRKVEM'
const WORKSPACE_ID = '69be2d4ad0271a6a70c331db'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 30 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed':   ['rate<0.01'],
  },
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
}

export default function () {
  const res = http.get(
    `http://localhost:4000/workspaces/${WORKSPACE_ID}/overview`,
    { headers }
  )

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  sleep(1)
}
