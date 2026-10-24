import { PendingAttachment, Attachment } from "@/src/types/chat";
import { useEffect, useState, type ReactNode } from "react";
import { getCachedFile } from "@/src/lib/FileCache";
import FileIcon from "@/src/icons/file.svg";
import CloseIcon from "@/src/icons/close.svg";
import ErrorIcon from "@/src/icons/warning.svg";
import DownloadIcon from "@/src/icons/download.svg";
import { AnimatePresence, motion } from "motion/react";
import * as XLSX from "xlsx";
import { createPortal } from "react-dom";
import mammoth from "mammoth";

function useCachedFileUrl(fileId: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(fileId));

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (!fileId) {
        setIsLoading(false);
        return;
      }
      const blob = await getCachedFile(fileId);
      if (!cancelled && blob) {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      }
      if (!cancelled) setIsLoading(false);
    }

    function handleCached(event: Event) {
      if ((event as CustomEvent<string>).detail === fileId) {
        setIsLoading(true);
        void load();
      }
    }

    void load();
    window.addEventListener("zeyrix-file-cached", handleCached);
    return () => {
      cancelled = true;
      window.removeEventListener("zeyrix-file-cached", handleCached);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return { src, isLoading };
}

function isDocument(mimeType: string, filename: string) {
  return mimeType === "text/plain" || mimeType.includes("word") ||
    mimeType.includes("spreadsheet") || /\.(txt|docx?|xlsx?|csv)$/i.test(filename);
}

function ImageOverlay({
  src,
  alt,
  isOpen,
  onClose,
}: {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay-backdrop"
          className="fixed inset-0 z-999 flex items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onClick={onClose}
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
        >
          <motion.div
            className="flex max-h-[95vh] max-w-[95vw] flex-col items-center gap-4 p-4 sm:p-10"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{
              duration: 0.16,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            <motion.img
              src={src}
              alt={alt}
              className="max-h-[82vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
              initial={{ scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.7 }}
            />
            <p className="text-sm text-white/90">{alt}</p>
            <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-elevated/95 p-1 shadow-lg">
              <button
                type="button"
                aria-label="Download image"
                title="Download image"
                className="rounded-full p-2.5 text-primary transition-colors hover:bg-primary/15 hover:text-primary-hover hover:cursor-pointer"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = src;
                  link.download = alt;
                  link.click();
                }}
              >
                <DownloadIcon className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Close image preview"
                title="Close image preview"
                className="rounded-full p-2.5 text-primary transition-colors hover:bg-primary/15 hover:text-primary-hover hover:cursor-pointer"
                onClick={onClose}
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function DocumentViewer({
  attachment,
  blob,
  onClose,
}: {
  attachment: Attachment;
  blob: Blob;
  onClose: () => void;
}) {
  const [content, setContent] = useState<ReactNode>("Loading...");

  useEffect(() => {
    let cancelled = false;

    async function parse() {
      try {
        const name = attachment.filename.toLowerCase();

        // TXT
        if (attachment.mimeType === "text/plain" || name.endsWith(".txt")) {
          const text = await blob.text();
          if (!cancelled) {
            setContent(
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {text}
              </pre>
            );
          }
          return;
        }

        // DOCX → mammoth
        if (name.endsWith(".docx") || attachment.mimeType.includes("word")) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml(
            { arrayBuffer },
            {
              styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em",
                "br[type='page'] => hr.docx-page-break",
              ],
            }
          );

          if (!cancelled) {
            setContent(
              <div
                className="docx-mammoth"
                dangerouslySetInnerHTML={{ __html: result.value }}
              />
            );
          }
          return;
        }

        // Excel
        const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });

        if (!cancelled) {
          setContent(
            <div className="w-full space-y-8">
              {workbook.SheetNames.map((sheet) => {
                const rows = XLSX.utils.sheet_to_json<
                  (string | number | boolean)[]
                >(workbook.Sheets[sheet], { header: 1, defval: "" });

                return (
                  <section
                    key={sheet}
                    className="w-fit overflow-hidden rounded-xl border border-border bg-background/60 shadow-sm"
                  >
                    <h3 className="border-b border-border bg-elevated px-4 py-3 font-semibold text-foreground">
                      {sheet}
                    </h3>
                    <div className="w-full overflow-x-auto">
                      <table className="min-w-max border-collapse text-left text-sm">
                        <tbody>
                          {rows.map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="odd:bg-elevated/40 hover:bg-primary/10"
                            >
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="border-b border-border/70 px-3 py-2 text-foreground"
                                >
                                  {String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          );
        }
      } catch {
        if (!cancelled) {
          setContent(<p className="text-foreground-muted">Unable to preview this document.</p>);
        }
      }
    }

    void parse();

    return () => {
      cancelled = true;
    };
  }, [attachment, blob]);

  function download() {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[97vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-elevated px-3 py-2.5 sm:px-6 sm:py-3">
          <p className="min-w-0 truncate font-medium text-foreground">
            {attachment.filename}
          </p>
          <div className="flex gap-1 sm:gap-2">
            <button
              aria-label="Download file"
              title="Download file"
              className="rounded-lg p-2 hover:bg-border"
              onClick={download}
            >
              <DownloadIcon className="size-4" />
            </button>
            <button
              aria-label="Close preview"
              title="Close preview"
              className="rounded-lg p-2 hover:bg-border"
              onClick={onClose}
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-auto bg-background p-3 text-foreground sm:p-6 md:p-8">
          {content}
        </div>
      </div>
    </div>
  );
}

interface AttachmentCardProps {
  attachment: PendingAttachment;
  onRemove: (localId: string) => void;
}

export function AttachmentCard({ attachment, onRemove }: AttachmentCardProps) {
  const { file, localId, status, error } = attachment;
  const isImage = file.type.startsWith("image/");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return <div className="bg-elevated border border-border rounded-lg w-30 h-30 shrink-0 relative group">
    {isImage && src ? <img src={src} alt={file.name} className="h-full w-full rounded-lg object-cover" /> :
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-2">
        <FileIcon className="size-4 text-foreground" />
        <p className="truncate text-center text-body-sm w-full">{file.name}</p>
        <p className="text-caption text-foreground-muted">{(file.size / 1048576).toFixed(2)} MB</p>
      </div>
    }
    <button
      className="absolute -right-1.5 -top-1.5 z-10 rounded-full border border-foreground-muted bg-border p-1.5 hover:cursor-pointer hover:border-primary-outline"
      onClick={() => onRemove(localId)}
    >
      <CloseIcon className="size-2" />
    </button>
    {status === "uploading" && <div className="absolute bottom-0 left-0 right-0 h-1 animate-pulse bg-primary" />}
    {status === "error" && <div className="absolute bottom-1 flex w-full items-center gap-1 bg-background text-caption"><ErrorIcon className="size-3 text-error" />{error}</div>}
  </div>;
}

export function MessageAttachment(attachment: Attachment) {
  const { fileId, filename, size, mimeType } = attachment;
  const isImage = mimeType.startsWith("image/");
  const { src, isLoading } = useCachedFileUrl(fileId);
  const [imageOpen, setImageOpen] = useState(false);
  const [document, setDocument] = useState<Blob | null>(null);

  async function openDocument() {
    const blob = await getCachedFile(fileId);
    if (blob) setDocument(blob);
  }

  return (
    <div className="relative h-30 w-30 shrink-0 overflow-hidden rounded-lg border border-border bg-elevated">
      {isImage && isLoading ? (
        <div className="h-full w-full animate-pulse bg-linear-to-r from-elevated via-border to-elevated" />
      ) : isImage && src ? (
        <>
          <motion.img
            layoutId={`attachment-${fileId}`}
            src={src}
            alt={filename}
            className="h-full w-full cursor-pointer rounded-lg object-cover"
            onClick={() => setImageOpen(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
          <ImageOverlay
            src={src}
            alt={filename}
            isOpen={imageOpen}
            onClose={() => setImageOpen(false)}
          />
        </>
      ) : (
        <button
          className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-2 hover:cursor-pointer"
          onClick={() => {
            if (isDocument(mimeType, filename)) void openDocument();
          }}
        >
          <FileIcon className="size-4" />
          <p className="w-full truncate text-center text-body-sm">{filename}</p>
          <p className="text-caption text-foreground-muted">
            {(size / 1048576).toFixed(2)} MB
          </p>
        </button>
      )}

      {document && (
        <DocumentViewer
          attachment={attachment}
          blob={document}
          onClose={() => setDocument(null)}
        />
      )}
    </div>
  );
}