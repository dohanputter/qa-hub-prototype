#!/bin/bash

# Function to replace string in files
replace_string() {
    local old=$1
    local new=$2
    # Using LC_ALL=C to avoid illegal byte sequence errors in some environments
    LC_ALL=C find app components lib hooks tools -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i '' "s|$old|$new|g"
}

# UI Components
replace_string "components/ui/alert-dialog" "components/ui/AlertDialog"
replace_string "components/ui/avatar" "components/ui/Avatar"
replace_string "components/ui/badge" "components/ui/Badge"
replace_string "components/ui/button" "components/ui/Button"
replace_string "components/ui/card" "components/ui/Card"
replace_string "components/ui/dialog" "components/ui/Dialog"
replace_string "components/ui/dropdown-menu" "components/ui/DropdownMenu"
replace_string "components/ui/input" "components/ui/Input"
replace_string "components/ui/label" "components/ui/Label"
replace_string "components/ui/popover" "components/ui/Popover"
replace_string "components/ui/scroll-area" "components/ui/ScrollArea"
replace_string "components/ui/select" "components/ui/Select"
replace_string "components/ui/separator" "components/ui/Separator"
replace_string "components/ui/skeleton" "components/ui/Skeleton"
replace_string "components/ui/table" "components/ui/Table"
replace_string "components/ui/tabs" "components/ui/Tabs"
replace_string "components/ui/textarea" "components/ui/Textarea"
replace_string "components/ui/toast" "components/ui/Toast"
replace_string "components/ui/toaster" "components/ui/Toaster"
replace_string "components/ui/use-toast" "components/ui/useToast"

# Other Components
replace_string "components/theme-toggle" "components/ThemeToggle"

# Hooks
replace_string "hooks/use-image-upload" "hooks/useImageUpload"
replace_string "hooks/use-notification-stream" "hooks/useNotificationStream"
replace_string "hooks/use-on-click-outside" "hooks/useOnClickOutside"

# Lib
replace_string "lib/mock-user" "lib/mockUser"
replace_string "lib/tiptap-utils" "lib/tiptapUtils"
replace_string "lib/gitlab/mock-data" "lib/gitlab/mockData"

# Actions
replace_string "app/actions/exploratory-sessions" "app/actions/exploratorySessions"

# Tools
replace_string "tools/add-mock-groups" "tools/addMockGroups"
replace_string "tools/add_mock_columns" "tools/addMockColumns"
replace_string "tools/add_unique_constraint" "tools/addUniqueConstraint"
replace_string "tools/clean_duplicates" "tools/cleanDuplicates"
replace_string "tools/migrate_qa_records" "tools/migrateQaRecords"
replace_string "tools/reset_mock_data" "tools/resetMockData"
replace_string "tools/seed-mock-data" "tools/seedMockData"

echo "Imports updated."
