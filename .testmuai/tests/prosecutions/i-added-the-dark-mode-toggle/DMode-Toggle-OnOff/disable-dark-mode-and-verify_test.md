---
mode: testing
max_steps: 30
timeout: 300
variables: {}
tags: [critique-gate]
url: https://kaneai-playground.lambdatest.io
---

# Disable dark mode and verify theme reverts to light mode

## Step 1
Navigate to https://kaneai-playground.lambdatest.io
Click the **Toggle dark mode** button to enable dark mode.
Click the **Toggle dark mode** button a second time.
Verify the page background has reverted to a light color.
Verify the page text has reverted to a dark color.
