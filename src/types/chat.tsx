import { SetStateAction } from "react";

export type StepStatus = "in_progress" | "done" | "error" | "awaiting_approval" | "denied" | "expired" | "forbidden"
export type StepKind = "tool_call" | "reasoning"

export type ToolDetails = {
  auditLogId?: string;
  tableName?: string;
  rowsAffected?: number;
  arguments?: string;
}

export type FailedGeneration = {
  name?: string;
  arguments?: string;
}

export interface AgentStep {
  id: string;
  kind: StepKind;
  label: string;
  status: StepStatus;
  approvalDetails?: ApprovalDetails;
  toolName?: string;
  toolDetails?: ToolDetails;
  failedGeneration?: FailedGeneration;
  isLast?: boolean;
  isNextReasoning?: boolean;
}

export type StreamEvent =
  | { type: "step_start"; id: string; kind: StepKind; label: string; status: StepStatus; toolName?: string; approvalDetails?: ApprovalDetails; toolDetails?: ToolDetails; failedGeneration?: FailedGeneration }
  | { type: "step_update"; id: string; status: StepStatus; approvalDetails?: ApprovalDetails; toolDetails?: ToolDetails; failedGeneration?: FailedGeneration }
  | { type: "text_delta"; delta: string }
  | {
      type: "done";
      status: "completed" | "approval_required";
      content: string;
      steps: AgentStep[];
      processingSeconds: number;
      generatedFiles?: GeneratedFile[];
    }
  | { type: "error"; message: string };

export type ApprovalDetails = {
  approvalId: string;
  approvalExpiresAt: string;
  toolName: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  actionSummary: string;
  affectRows: number;
  reversible: boolean;
  paramsPreview: any;
  status:
    "pending" | "approved" | "rejected" | "expired" | "executed" | "failed";
  appliedAt: string | null;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  status: "completed" | "pending" | "error" | "approval_required" | "cancelled";
  text: string;
  attachments?: Attachment[];
  createdAt: string;
  processingSeconds?: number;
  steps?: AgentStep[];
  streamingReasoning?: string;
  notSent?: boolean;
  applyToolUse: (
    requestId: string,
    action: "confirm" | "reject",
  ) => Promise<void>;
  retrySendMessage?: (
    id: string,
    prompt: string,
    attachments: Attachment[],
    deleteFromLocal: boolean,
  ) => void;
  setShouldScroll?: (value: SetStateAction<boolean>) => void;
};

export type Attachment = {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type GeneratedFile = {
  type: "document" | "image";
  id: string;
  accessToken: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
};

export type ApiChat = {
  id: string;
  title: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  name: string;
  updatedAt: string;
};

export function mapChat(chat: ApiChat): Chat {
  return {
    id: chat.id,
    name: chat.title,
    updatedAt: chat.updated_at,
  };
}

export interface PendingAttachment {
  localId: string;
  file: File;
  status: "uploading" | "done" | "error";
  fileId: string | null;
  error: string | null;
}

export interface PresignResponse {
  uploadUrl: string;
  fileId: string;
}

export function mapAttachments(attachment: PendingAttachment): Attachment {
  if (!attachment.fileId) {
    throw new Error("Attachment has no fileId");
  }

  return {
    fileId: attachment.fileId ?? crypto.randomUUID(),
    mimeType: attachment.file.type,
    filename: attachment.file.name,
    size: attachment.file.size,
  };
}

export type AccessInvite = {
  status: "pending" | "activated" | "expired" | "exhausted" | "revoked" | "notFound";
  activationExpiresAt?: string;
  activatedAt?: string;
  accessExpiresAt?: string;
}