import http from 'k6/http'
import { check, sleep } from 'k6'   // ← add sleep to import

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJlMmQ0OWQwMjcxYTZhNzBjMzMxZDciLCJlbWFpbCI6InJhaHVsQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc0MDk0MDYzLCJleHAiOjE3NzQxODA0NjN9.zgFz6hoQF85cVDcyb1gnWpnBidbRsGTL1Ul5pxRKVEM'
const WORKSPACE_ID = '69be2d4ad0271a6a70c331db'

export const options = {
  stages: [
    { duration: '1m',  target: 50  },
    { duration: '2m',  target: 50  },
    { duration: '1m',  target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '1m',  target: 200 },
    { duration: '2m',  target: 200 },
    { duration: '1m',  target: 0   },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // ← now realistic to expect <1s
    'http_req_failed':   ['rate<0.01'],
  },
}

const headers = { 'Authorization': `Bearer ${TOKEN}` }

export default function () {
  const responses = http.batch([
    ['GET', `http://localhost:4000/workspaces/${WORKSPACE_ID}/entities`, null, { headers }],
    ['GET', `http://localhost:4000/workspaces/${WORKSPACE_ID}/overview`, null, { headers }],
  ])

  check(responses[0], { 'entities 200': (r) => r.status === 200 })
  check(responses[1], { 'overview 200': (r) => r.status === 200 })

  sleep(1)  
}
