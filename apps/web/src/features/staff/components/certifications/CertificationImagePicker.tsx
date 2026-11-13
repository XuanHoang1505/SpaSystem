import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImageIcon, ImagePlusIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { certificationImageAccept, checkCertificationImage } from './certificationImageFile';

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Picks the photo of a certificate: drop zone when empty, large preview with replace/clear when chosen, the current
 * photo when editing. Checks type and size before handing the file over (BR-STF-15).
 */
export function CertificationImagePicker({
  value,
  currentUrl,
  disabled,
  onChange,
}: {
  value: File | null;
  currentUrl: string | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();

  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const take = (file: File | undefined) => {
    if (!file) return;
    const problem = checkCertificationImage(file);
    setError(problem);
    if (!problem) onChange(file);
  };
  const open = () => inputRef.current?.click();
  const shownUrl = previewUrl ?? currentUrl;

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      setDragging(false);
      take(event.dataTransfer.files[0]);
    },
  };

  return (
    <div className="grid gap-1.5">
      <p id={titleId} className="text-sm leading-none font-medium">
        Ảnh chụp bằng
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={certificationImageAccept}
        className="sr-only"
        tabIndex={-1}
        aria-label="Chọn tệp ảnh chụp bằng"
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {shownUrl ? (
        <div
          {...dropHandlers}
          className={cn(
            'overflow-hidden rounded-xl border bg-muted/30 transition-colors',
            dragging && 'border-primary bg-primary/5',
          )}
        >
          <div className="relative">
            <ImageWithFallback
              src={shownUrl}
              alt={previewUrl ? 'Ảnh bằng sẽ tải lên' : 'Ảnh bằng hiện tại'}
              fallbackIcon={ImageIcon}
              className="h-44 w-full object-contain"
            />
            <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm">
              {previewUrl ? 'Ảnh mới' : 'Ảnh hiện tại'}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-3 py-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {value ? `${value.name} · ${formatSize(value.size)}` : 'Thả ảnh khác vào đây để thay'}
            </p>
            <div className="flex shrink-0 gap-1">
              <Button type="button" size="sm" variant="outline" onClick={open} disabled={disabled}>
                <RefreshCwIcon aria-hidden="true" />
                {value ? 'Đổi ảnh' : 'Thay ảnh'}
              </Button>
              {value && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    onChange(null);
                  }}
                  disabled={disabled}
                >
                  <XIcon aria-hidden="true" />
                  Bỏ chọn
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          aria-labelledby={titleId}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          {...dropHandlers}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
            'hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-60',
            dragging && 'border-primary bg-primary/5',
            error && 'border-destructive/60',
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <ImagePlusIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-foreground">
            {dragging ? 'Thả ảnh vào đây' : 'Kéo thả ảnh vào đây hoặc bấm để chọn'}
          </span>
          <span id={hintId} className="text-xs text-muted-foreground">
            Không bắt buộc · JPEG, PNG, WebP · tối đa 5 MB
          </span>
        </button>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
