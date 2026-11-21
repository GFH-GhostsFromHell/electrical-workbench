# Electrical Workbench — GitHub repository rename migration

This document prepares the **repository-only** rename from
`GFH-GhostsFromHell/jhipster-javafx-remote-platform` to
`GFH-GhostsFromHell/electrical-workbench`.

**Status:** This branch is deliberately staged for merging **after** GitHub's
repository name has been changed in repository Settings. The GitHub app connection
available to ChatGPT can write code but cannot modify the repository's name.

## One account-level action

1. Visit `https://github.com/GFH-GhostsFromHell/jhipster-javafx-remote-platform/settings`.
2. Change the repository name to `electrical-workbench` and save.
3. Verify the URL `https://github.com/GFH-GhostsFromHell/electrical-workbench`.
4. Merge the staged rename PR into `main`, then review Actions and releases.

The repo name is currently available only if GitHub accepts the requested
name at the time of rename. Do not create a different repository: rename
the existing one so issues, stars, history and releases remain associated.

## References changed by this PR

- Root README links, clone URL and example checkout directory.
- The Windows updater's GitHub releases API fallback URL.
- The Spring portal's GitHub releases API URL.

The Windows client already uses `github.repository` in its release publishing
workflow, so the release action will automatically use the new repo slug.
The GitHub Actions workflow names, event triggers and branches stay the same.

## References deliberately **not** changed

- **Render service and domain:** `remote-javafx-portal` and
  `https://remote-javafx-portal.onrender.com`. The domain is referenced by
  Android, desktop, iOS and existing user sessions. Renaming the Render
  service or changing its public URL is a **separate migration**, not required
  for the GitHub repository rename.
- **Render PostgreSQL resource:** `remote-javafx-portal-db`. Never recreate
  or rename a production database just to update branding.
- **Application IDs and package names:** Android
  `com.gfh.electricalworkbench`, Java package names, iOS bundle identity
  and installed Windows product identity. Renaming these can affect updates,
  signing, saved data and side-by-side installation behavior.
- **Windows installer asset:** `RemoteJavaFXClient-Setup.msi`. The updater
  looks for this exact filename; changing it without a tested installer/
  upgrade migration could break existing installations.
- **JHipster starter folders and Java Spring package:** these are internal
  implementation identifiers and do not affect public branding.
- **Device Security Center:** a separate repository. Any provenance link to
  the previous repo slug will generally follow GitHub's redirect.

## Post-rename smoke checks

1. Confirm `main`, issues, tags and Releases resolve under the new repo.
2. Confirm GitHub Actions has its expected Android, desktop, iOS and portal jobs.
3. Ensure a successful desktop release still contains
   `RemoteJavaFXClient-Setup.msi`.
4. Confirm the Spring portal's `/api/public/releases/desktop` endpoint
   can retrieve the relevant release (do not infer this from build success).
5. On a test Windows client, verify the GitHub update fallback finds the
   correct release and installer digest; perform an upgrade only on a
   disposable test device.
6. Verify the existing Render service remains connected to the **renamed**
   repository and its linked branch is `main`. Inspect the service settings
   if automatic deployments do not continue.
7. Verify public health and sign-in, and confirm Android/iOS apps still
   reach the original Render host.
8. If production deploy verification fails, investigate it independently;
   a repository rename is not evidence of a healthy deployment.

## Optional later public-site branding

If a branded URL is desired, prefer a verified custom domain and a staged
multi-platform release with a transition period. Update domain trust rules,
Android URLs, iOS WebKit cookies, desktop portal configuration, OAuth callback
allowlists, email links and Render health checks only after the new endpoint
and authentication path are tested. Keep the old hostname reachable where
possible during migration.
