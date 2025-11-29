import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.accessToken) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return new NextResponse('Missing URL parameter', { status: 400 });
        }

        // Fetch the image with authentication
        const response = await fetch(imageUrl, {
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
            },
        });

        if (!response.ok) {
            return new NextResponse('Failed to fetch image', { status: response.status });
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error proxying image:', error);
        return new NextResponse('Error proxying image', { status: 500 });
    }
}

