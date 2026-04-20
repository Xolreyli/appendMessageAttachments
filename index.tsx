/*
 * Vencord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { findByPropsLazy } from "@webpack";
import { Constants, Menu, RestAPI, showToast, Toasts } from "@webpack/common";

const UserStore = findByPropsLazy("getCurrentUser");

type DiscordAttachment = {
    id: string;
    filename?: string;
    description?: string | null;
};

type DiscordUser = {
    id?: string;
    username?: string;
};

type DiscordMessage = {
    id: string;
    channel_id: string;
    author?: DiscordUser;
    attachments?: DiscordAttachment[];
};

let pendingPasteTarget: DiscordMessage | null = null;
let pendingPasteTimer: number | null = null;

function getCurrentUserId(): string | null {
    return UserStore?.getCurrentUser?.()?.id ?? null;
}

function isOwnMessage(message?: DiscordMessage | null): boolean {
    const me = getCurrentUserId();
    return !!message?.author?.id && !!me && message.author.id === me;
}

function isProbablyEditable(message?: DiscordMessage | null): boolean {
    if (!message?.id || !message?.channel_id) return false;
    if (!isOwnMessage(message)) return false;
    return true;
}

function buildRetainedAttachments(existing?: DiscordAttachment[]) {
    return (existing ?? []).map(att => ({
        id: att.id,
        filename: att.filename,
        description: att.description ?? undefined
    }));
}

async function appendFilesToMessage(message: DiscordMessage, newFiles: File[]) {
    if (!isProbablyEditable(message)) {
        showToast("That message cannot be edited.", Toasts.Type.FAILURE);
        return;
    }

    if (!newFiles.length) {
        showToast("No files selected.", Toasts.Type.MESSAGE);
        return;
    }

    const retained = buildRetainedAttachments(message.attachments);
    const form = new FormData();

    newFiles.forEach((file, i) => {
        form.append(`files[${i}]`, file, file.name);
    });

    const newAttachmentEntries = newFiles.map((file, i) => ({
        id: String(i),
        filename: file.name
    }));

    form.append("payload_json", JSON.stringify({
        attachments: [
            ...retained,
            ...newAttachmentEntries
        ]
    }));

    try {
        await RestAPI.patch({
            url: Constants.Endpoints.MESSAGE(message.channel_id, message.id),
            body: form
        });

        showToast(
            `Appended ${newFiles.length} file${newFiles.length === 1 ? "" : "s"} to the message.`,
            Toasts.Type.SUCCESS
        );
    } catch (err) {
        console.error("[AppendMessageAttachments] Failed to append attachments:", err);
        showToast("Failed to append files to the message.", Toasts.Type.FAILURE);
    }
}

function pickFiles(): Promise<File[]> {
    return new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.style.display = "none";

        input.onchange = () => {
            const files = Array.from(input.files ?? []);
            input.remove();
            resolve(files);
        };

        input.oncancel = () => {
            input.remove();
            resolve([]);
        };

        document.body.appendChild(input);
        input.click();
    });
}

async function readPasteEventFiles(e: ClipboardEvent): Promise<File[]> {
    const files: File[] = [];

    const directFiles = Array.from(e.clipboardData?.files ?? []);
    if (directFiles.length) {
        for (const file of directFiles) {
            const type = file.type || "";
            const ext = type.split("/")[1]?.split(";")[0];

            if (!file.name || file.name === "image.png") {
                const fallbackName = type.startsWith("image/")
                    ? `pasted-image.${ext || "png"}`
                    : `pasted-file.${ext || "bin"}`;

                files.push(new File([file], fallbackName, { type: file.type }));
            } else {
                files.push(file);
            }
        }

        return files;
    }

    const items = e.clipboardData?.items;
    if (!items?.length) return files;

    for (const item of items) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();
        if (!file) continue;

        const type = file.type || "";
        const ext = type.split("/")[1]?.split(";")[0];

        if (!file.name || file.name === "image.png") {
            const fallbackName = type.startsWith("image/")
                ? `pasted-image.${ext || "png"}`
                : `pasted-file.${ext || "bin"}`;

            files.push(new File([file], fallbackName, { type: file.type }));
        } else {
            files.push(file);
        }
    }

    return files;
}

function clearPendingPasteTarget() {
    pendingPasteTarget = null;

    if (pendingPasteTimer != null) {
        clearTimeout(pendingPasteTimer);
        pendingPasteTimer = null;
    }
}

function armPendingPasteTarget(message: DiscordMessage) {
    clearPendingPasteTarget();
    pendingPasteTarget = message;

    showToast("Now press Ctrl+V to append the clipboard image/file to this message.", Toasts.Type.MESSAGE);

    pendingPasteTimer = window.setTimeout(() => {
        clearPendingPasteTarget();
        showToast("Clipboard append timed out.", Toasts.Type.MESSAGE);
    }, 15000);
}

async function handleAppendPickedFiles(message: DiscordMessage) {
    const files = await pickFiles();
    if (!files.length) return;
    await appendFilesToMessage(message, files);
}

async function handlePendingPaste(e: ClipboardEvent) {
    if (!pendingPasteTarget) return;

    const message = pendingPasteTarget;
    const files = await readPasteEventFiles(e);

    if (!files.length) {
        showToast("No image/file was found in that paste.", Toasts.Type.MESSAGE);
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    clearPendingPasteTarget();
    await appendFilesToMessage(message, files);
}

const MessageContext: NavContextMenuPatchCallback = (children, props: any) => {
    const message = props?.message as DiscordMessage | undefined;
    if (!isProbablyEditable(message)) return;

    children.splice(-1, 0,
        <Menu.MenuSeparator />,
        <Menu.MenuItem id="append-message-attachments" label="Append Attachments">
            <Menu.MenuItem
                id="append-message-attachments-files"
                label="Append Files…"
                action={() => { void handleAppendPickedFiles(message!); }}
            />
            <Menu.MenuItem
                id="append-message-attachments-paste"
                label="Paste Next Clipboard Image/File"
                action={() => armPendingPasteTarget(message!)}
            />
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "AppendMessageAttachments",
    description: "Append files or pasted clipboard images/files to your already-sent messages.",
    authors: [{ name: "Michael", id: 0n }],

    contextMenus: {
        message: MessageContext
    },

    start() {
        document.addEventListener("paste", handlePendingPaste, true);
    },

    stop() {
        document.removeEventListener("paste", handlePendingPaste, true);
        clearPendingPasteTarget();
    }
});