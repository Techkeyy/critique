---
mode: testing
max_steps: 30
timeout: 300
variables: {}
tags: [quarantined]
url: https://kaneai-playground.lambdatest.io
---

# Disable dark mode and verify return to light theme

## Step 1
Disable dark mode and verify return to light theme

This test verifies that toggling the dark mode switch off correctly reverts the UI from the dark theme back to the default light theme.

Steps:
Navigate to https://kaneai-playground.lambdatest.io
Click the dark mode toggle switch to enable dark mode.
Click the dark mode toggle switch again to disable it.
Verify the page background and text colors have reverted.
