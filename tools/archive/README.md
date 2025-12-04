# Archived Migration Scripts

These scripts were used for one-time database migrations and setup tasks. They are kept here for reference but should not be run again.

## Scripts

| Script | Purpose | Run Date |
|--------|---------|----------|
| `addMockColumns.ts` | Added `json_labels` and `assignee_id` columns to qa_issues table | Nov 2024 |
| `addMockGroups.ts` | Added mock groups for development | Nov 2024 |
| `addUniqueConstraint.ts` | Added unique constraint on (gitlab_project_id, gitlab_issue_iid) | Nov 2024 |
| `cleanDuplicates.ts` | Cleaned up duplicate qa_issues records | Nov 2024 |
| `migrateQaRecords.ts` | Migrated from old qa_records table to new qa_issues/qa_runs schema | Nov 2024 |

> **Warning**: These scripts are historical and should not be run on the current database.
