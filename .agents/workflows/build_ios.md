# Workflow: Building for iOS Platform (Capacitor)

This guide describes how to build and package **RupeeLedger** as a native iOS application.

---

## Prerequisites
1. **GitHub Account:** Required for cloud-based compilation (free, does not require a Mac).
2. **Apple Developer Account (Optional):** Required only if you want to publish the `.ipa` to the App Store or run it on a physical iOS device without developer mode.

---

## Method A: Cloud Build via GitHub Actions (No Mac Required)
This is the recommended path for Windows users. GitHub provides macOS virtual machines for running Xcode builds in the cloud.

### 1. Create a GitHub Action Workflow
Create a file at `.github/workflows/build-ios.yml` in your repository with the following content:

```yaml
name: Build iOS App

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    name: Build IPA
    runs-on: macos-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Web App
        env:
          IS_STATIC: 'true'
        run: npm run build

      - name: Add iOS Platform
        run: npx cap add ios

      - name: Sync Web Assets to iOS
        run: npx cap sync ios

      - name: Build Xcode Project
        run: |
          xcodebuild -workspace ios/App/App.xcworkspace \
                     -scheme App \
                     -sdk iphoneos \
                     -configuration Release \
                     CODE_SIGNING_ALLOWED=NO \
                     clean build

      - name: Archive Build
        uses: actions/upload-artifact@v4
        with:
          name: Xcode-iOS-Workspace
          path: ios/App
```

### 2. Run the Workflow
1. Commit and push the code (including the `.github/workflows/build-ios.yml` file) to your GitHub repository.
2. Go to the **Actions** tab on your GitHub repository page.
3. Select the **Build iOS App** workflow and click **Run workflow**.
4. Once completed, download the built app workspace from the artifacts.

---

## Method B: Local Build (Requires a macOS System)
If you have access to a Mac, you can compile and run the app locally in Xcode.

### 1. Initialize Capacitor iOS
Run the following commands in the terminal:
```bash
# 1. Compile Next.js as a static export
$env:IS_STATIC="true"     # On Windows PowerShell
export IS_STATIC=true     # On macOS/Linux
npm run build

# 2. Add the iOS native platform
npx cap add ios

# 3. Open the project in Xcode (only works on macOS)
npx cap open ios
```

### 2. Compile and Deploy in Xcode
1. Once Xcode opens, select your target simulator or connected iOS device at the top.
2. Click the **Play** button to build and run the application.
