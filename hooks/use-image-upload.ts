import { useCallback } from 'react';
import { uploadAttachment } from '@/app/actions/uploadAttachment';

export function useImageUpload(projectId?: number) {
    const handleImagePaste = useCallback(async (file: File) => {
        if (!projectId) {
            throw new Error('Please select a project first');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId.toString());

        const result = await uploadAttachment(formData);
        return result;
    }, [projectId]);

    return { handleImagePaste };
}
