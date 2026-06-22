# Setup Guide — Claude Connected Pack

This bundle works differently from our other bundles. Instead of pasting instructions into a Project's Custom Instructions, you're turning on real connections between Claude and your other apps — Gmail, Google Calendar, Google Drive, Slack, and/or Notion. This guide covers both: turning the connections on, and where to use the workflows from SKILLS.md once they are.

Total time: about 10 minutes to connect your first app, then about 2 minutes for each additional one.

---

## Before You Start

You will need:
- A Claude.ai account (free or paid — connectors are available on all plans, though a few advanced or third-party connectors may vary)
- Login access to whichever apps you want to connect (your own Gmail, Google account, Slack workspace, and/or Notion workspace)

You do not need to install anything. Everything is done through your web browser.

---

## Step 1: Open Settings → Connections

1. Log into **claude.ai**.
2. Click your account icon or name (usually bottom-left or top-right, depending on your view).
3. Click **Settings**.
4. Click **Connections** (sometimes shown as **Connectors** or **Integrations**).

---

## Step 2: Connect Your First App

1. In the Connections page, find the app you want to connect first — we recommend starting with **Gmail** or **Google Calendar**, since the workflows for those tend to save the most time fastest.
2. Click **Connect**.
3. You'll be redirected to log into that account (Google, Slack, Notion, etc.) and approve the specific permissions Claude is requesting.
4. Carefully review what permissions are being requested. You're in control — you can disconnect at any time, and connecting does not give Claude unlimited or permanent access beyond what's shown.
5. Once approved, you'll be returned to Claude, and the app will now show as **Connected**.

---

## Step 3: Repeat for Any Other Apps You Want

Repeat Step 2 for Google Drive, Slack, Notion, or any other connector you want active. You do not need to connect everything at once — connect only what you'll actually use.

**Recommended starting point, based on what saves the most time fastest:**
- Drowning in email → **Gmail**
- Constantly double-booked or unsure what's free → **Google Calendar**
- Hunting for the same documents repeatedly → **Google Drive**
- Missing important Slack context → **Slack**
- Notes scattered everywhere → **Notion**

---

## Step 4: Set Up Your First Workflow

1. Open **SKILLS.md** from this bundle.
2. Find the workflow matching the connector you just turned on — for example, **Skill #1: Inbox Triage Workflow** if you connected Gmail.
3. You can use these workflows directly in a regular chat (no Project required, since the connector itself is what provides the access) — though creating a dedicated Project for frequently-used workflows is still a good idea for consistency.
4. If using a Project: create one (see any of our other Setup Guides for the click-by-click Project creation steps), open **Custom Instructions**, and paste in the workflow text from SKILLS.md.
5. If using a regular chat: just paste the workflow text directly into your message, followed by your actual request.

---

## Step 5: Try It

1. Start a chat (inside your new Project, or a regular chat — either works).
2. Use the "Try it" example under the skill you set up.
3. Claude will use the connected app to give you a real, specific answer — not a generic one.

If Claude says it can't access something, double check that connector's status in Settings → Connections, and see the **Connector Health Check** skill (#8 in SKILLS.md) for full troubleshooting steps.

---

## A Note on Safety and Control

Connectors are powerful, which means it's worth a moment of caution:

- **Review before anything sends.** Every workflow in this bundle is written to draft and show you things (emails, Slack messages, Notion edits) before taking real action — never let an AI tool send something on your behalf without a final human check, especially early on.
- **You can disconnect any app at any time** from Settings → Connections, instantly, with no penalty.
- **Permissions are specific**, not all-or-nothing — review exactly what access you're approving when you connect each app.
- **Start with read-heavy workflows** (like Inbox Triage or Calendar Command Center) before workflows that draft content, until you're comfortable with how the connector behaves.

---

## Troubleshooting

**"I don't see Connections in my Settings."**
Make sure you're logged into claude.ai in a browser (not a third-party app), and check for updates if you're on a desktop or mobile app — connector availability is rolled out over time.

**"I connected an app but Claude still says it can't see anything."**
Go back to Settings → Connections and confirm the app shows as "Connected," not "Pending" or "Error." If it shows an error, try disconnecting and reconnecting.

**"Can other people see that I've connected my accounts?"**
No — your connections are private to your account, the same as your chat history.

**Still stuck?** Email **support@claudecraft.ca** — we'll get you sorted, usually same day.
