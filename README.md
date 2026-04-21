# AppendMessageAttachments

Append files or clipboard images to your **already-sent Discord messages** using Vencord.

---

## Features

- **Append Files:** Add one or more files to a message after it’s been sent.

- **Paste Next Clipboard Image/File:** Paste an image or file from your clipboard onto a message.

- **Keeps existing attachments:** New files are added without removing existing ones.

---

## Usage

### Append files manually

1. Right-click **your own message**
2. Click **Append Attachments**
3. Select **Append Files...**
4. Choose your file(s)

### Paste from clipboard

1. Copy an image or file (`Ctrl + C`)
2. Right-click **your own message**
3. Click **Append Attachments → Paste Next Clipboard Image/File**
4. Press `Ctrl + V`

---

## Limitations

* Only works on **your own messages**
* Message must still be **editable** (Discord time limits apply)
* File uploads are still subject to **Discord upload limits**
* Clipboard paste requires a valid image/file (not just a URL)

---

## Installation Guide

View the installation guide by clicking the hyperlink below:

[Instructions for installation](https://discord.com/channels/1015060230222131221/1257038407503446176)

---

## File Structure

```
appendMessageAttachments/
└── index.tsx
```

---

## Notes

This plugin relies on Discord’s internal message editing and attachment handling.
As a result of this, **future Discord or Vencord updates may break functionality**.

### macOS Notes

- Use `Cmd + V` instead of `Ctrl + V`
- Clipboard pasting may vary depending on how the image/file was copied
- If clipboard paste does not work, use **Append Files...** instead

---

## License

Licensed under the GNU General Public License v3.0.
