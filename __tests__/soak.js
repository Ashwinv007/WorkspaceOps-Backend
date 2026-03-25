import http from 'k6/http'
import { check, sleep } from 'k6'

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJlMmQ0OWQwMjcxYTZhNzBjMzMxZDciLCJlbWFpbCI6InJhaHVsQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc0MjM5Mjg3LCJleHAiOjE3NzQzMjU2ODd9.3D7ZwV3IBnpGgzDz0WrN40nTs4r928rUwO3G2Hfc4qM'
const WORKSPACE_ID = '69be2d4ad0271a6a70c331db'

export const options = {
  stages: [
    { duration: '5m',  target: 50 },   // ramp up
    { duration: '8h',  target: 50 },   // hold at 50 users for 4 hours
    { duration: '5m',  target: 0  },   // ramp down
  ],
  thresholds: {
    'http_req_failed':   ['rate<0.01'],       // less than 1% errors
    'http_req_duration': ['p(95)<1000'],      // p(95) stays under 1s throughout
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
