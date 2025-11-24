export default function Loading() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 animate-pulse rounded" />
                    <div>
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
                        <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
                    </div>
                </div>
            </div>
            <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-white shadow-sm">
                <div className="space-y-6">
                    <div className="h-10 bg-gray-200 animate-pulse rounded" />
                    <div className="h-10 bg-gray-200 animate-pulse rounded" />
                    <div className="h-48 bg-gray-200 animate-pulse rounded" />
                </div>
            </div>
        </div>
    );
}
