---
mode: testing
max_steps: 30
timeout: 300
variables: {}
tags: [critique-gate]
url: https://kaneai-playground.lambdatest.io
---

# Edit file content, mark as fixed, and finish the session

## Step 1
Edit file content, mark as fixed, and finish the session

Verifies a user can navigate to the Kane AI Playground, edit the file, mark it as fixed, and successfully finish the task.

Steps:
Navigate to https://kaneai-playground.lambdatest.io
In the code editor, add the text '// My fix' to the existing content.
Click the button labeled 'Fixed'.
Click the button labeled 'Finish'.
Verify the session has concluded and the main interface is no longer interactive.
