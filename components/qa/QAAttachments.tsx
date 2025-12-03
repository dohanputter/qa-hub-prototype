import { Label } from '@/components/ui/Label';
import { Paperclip, Plus, X } from 'lucide-react';
import type { QAAttachmentsProps } from '@/types/qa';

export function QAAttachments({ attachments, onRemove, onUpload }: QAAttachmentsProps) {
    return (
        <div className="space-y-4">
            <Label className="text-base font-medium">Attachments</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attachments.map((att: any) => (
                    <div key={att.id} className="group relative flex flex-col items-center justify-center p-4 border border-border/40 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/20 shadow-sm">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <a href={att.url} target="_blank" className="text-sm font-medium text-foreground hover:underline truncate w-full px-2" title={att.filename}>{att.filename}</a>
                        <button
                            onClick={() => onRemove(att.id, att.filename)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-full text-destructive"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border/60 rounded-xl cursor-pointer hover:bg-slate-50/50 hover:border-primary/40 transition-all gap-2 text-muted-foreground hover:text-primary">
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Add File</span>
                    <input type="file" className="hidden" onChange={onUpload} />
                </label>
            </div>
        </div>
    );
}
