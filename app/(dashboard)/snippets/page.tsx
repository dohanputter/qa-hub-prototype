import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SnippetsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Snippets</h2>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Snippet
                </Button>
            </div>
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg border-dashed bg-gray-50">
                <p className="text-muted-foreground">No snippets found.</p>
                <Button variant="link">Create your first snippet</Button>
            </div>
        </div>
    );
}
