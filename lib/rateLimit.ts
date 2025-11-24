const recentUploads = new Map<string, number[]>();

export async function checkUploadRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userUploads = recentUploads.get(userId) || [];
    const recent = userUploads.filter((t) => now - t < 60000);

    if (recent.length >= 10) return false;

    recentUploads.set(userId, [...recent, now]);
    return true;
}
