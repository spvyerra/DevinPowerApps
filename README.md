# DevinPowerApps

## Basic Details

1. Webpage that you can create new Apps from
    1. Internal App Catalog that showcases all of the available apps to use
    2. New App Creator
        1. Provide UI explanation or screenshot
        2. Connect to internal wikis and other documentation to access the correct APIs for a given internal service to surface data
        3. Kick off devin runs to create the actual application
            1. Utilize the Devin API
            2. Create a Pull request in the repo
    3. Security
        1. Have access control panel to determine which users have access to a given app
        2. Use your existing SSO solution
        3. Enable cron schedule for running Devin Security for fixes

## Architecture

High Level

```mermaid
flowchart LR
    Users(["Prototype Users"])

    subgraph UI["Prototype UI"]
        Catalog["Internal App Catalog"]
        Frontends["Internal App Frontends"]
    end

    subgraph Services["Existing Services"]
        Svc["Business Services (abstract)"]
    end

    subgraph Devin["Devin Cloud"]
        Security["Devin Security"]
        Wiki["Deep Wiki"]
        Scans["Code Scans"]
        Creator["App Creator"]
    end

    Repo[("Prototype GitHub Repo")]

    Users --> UI
    UI -- "Requests on behalf of users" --> Devin
    UI -- "Requests" --> Services
    Devin -- "Opens PRs with requested updates" --> Repo
    Repo -- "GitHub Actions deploy" --> UI
```

App Creation - Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Prototype User
    participant UI as Prototype UI
    participant Creator as Devin Cloud (App Creator)
    participant Wiki as Devin Cloud (Deep Wiki)
    participant Review as Devin Review
    participant Repo as Prototype GitHub Repo
    actor SWE as SWE Team Member
    participant Actions as GitHub Actions

    User->>UI: Request new Internal App (UI explanation/image + service features)
    UI->>Creator: Kick off Devin Cloud run on behalf of user
    Creator->>Wiki: Query which service APIs to consume
    Wiki-->>Creator: Service API context
    Creator->>Creator: Build new page in Prototype UI from API context + UI explanation
    Creator->>Repo: Submit PR

    loop Until Devin Review finds no issues
        Review->>Repo: Audit PR
        opt Mistakes found
            Review->>Creator: Report bugs
            Creator->>Repo: Push fixes to PR
        end
    end

    SWE->>Repo: Audit and merge PR
    Repo->>Actions: Merge triggers workflow
    Actions->>UI: Deploy new webpage to App Catalog
    UI-->>User: New Internal App available in catalog
```
