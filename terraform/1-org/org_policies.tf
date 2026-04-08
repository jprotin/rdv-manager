# ── Org-level : bucket uniform access obligatoire
resource "google_org_policy_policy" "storage_uniform_access" {
  name   = "organizations/${var.org_id}/policies/storage.uniformBucketLevelAccess"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# ── Folder-level : pas de clés SA dans staging / production
resource "google_org_policy_policy" "no_sa_keys_staging" {
  name   = "${google_folder.staging.name}/policies/iam.disableServiceAccountKeyCreation"
  parent = google_folder.staging.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

resource "google_org_policy_policy" "no_sa_keys_production" {
  name   = "${google_folder.production.name}/policies/iam.disableServiceAccountKeyCreation"
  parent = google_folder.production.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
