---
mode: testing
max_steps: 30
timeout: 300
variables: {}
tags: [quarantined]
url: https://kaneai-playground.lambdatest.io
---

# Verify failure from one session is not visible in a different session

## Step 1
Verify failure from one session is not visible in a different session

Confirms strict session isolation by creating a failure in one session and verifying it is not visible on the failure dashboard of a second, unrelated session as per D-12.

Steps:
1. In a new browser window (Session A), navigate to https://kaneai-playground.lambdatest.io.
2. Perform an action designed to trigger and record a failure.
3. Open a new, separate incognito window or a different browser profile to establish Session B.
4. In Session B, navigate to https://kaneai-playground.lambdatest.io.
5. Navigate to the 'Recorded Failures' dashboard page.
6. Verify the content of the failure list.
