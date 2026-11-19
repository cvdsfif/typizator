import { execSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const SEMICOLON = String.fromCharCode(59)
const checkedExtensions = new Set([".js", ".ts", ".mjs", ".cjs"])

function listFiles() {
    try {
        return execSync("git ls-files", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean)
    } catch {
        const files = []
        const walk = directory => {
            for (const entry of readdirSync(directory, { withFileTypes: true })) {
                const path = join(directory, entry.name)
                if (entry.isDirectory()) {
                    if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") walk(path)
                } else {
                    files.push(path)
                }
            }
        }
        walk(".")
        return files
    }
}

const trackedFiles = listFiles()
    .filter(file => {
        const dot = file.lastIndexOf(".")
        const extension = dot === -1 ? "" : file.slice(dot)
        return checkedExtensions.has(extension) || extension === ".md"
    })

const violations = []

function lineStartsFor(text) {
    const starts = [0]
    let index = 0
    while (index < text.length) {
        if (text[index] === "\n") starts.push(index + 1)
        index += 1
    }
    return starts
}

function lineNumberAt(starts, index) {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
        const mid = (low + high + 1) >> 1
        if (starts[mid] <= index) low = mid
        else high = mid - 1
    }
    return low + 1
}

function isIdentifierStart(char) {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_" || char === "$"
}

function isIdentifierPart(char) {
    return isIdentifierStart(char) || (char >= "0" && char <= "9")
}

function skipSpaceAndComments(text, cursor) {
    while (cursor < text.length) {
        if (/\s/.test(text[cursor])) {
            cursor += 1
            continue
        }
        if (text[cursor] === "/" && text[cursor + 1] === "/") {
            cursor += 2
            while (cursor < text.length && text[cursor] !== "\n") cursor += 1
            continue
        }
        if (text[cursor] === "/" && text[cursor + 1] === "*") {
            cursor += 2
            while (cursor < text.length && !(text[cursor] === "*" && text[cursor + 1] === "/")) cursor += 1
            cursor = Math.min(cursor + 2, text.length)
            continue
        }
        return cursor
    }
    return cursor
}

function checkText(text, name, lineOffset) {
    const starts = lineStartsFor(text)
    const length = text.length
    const forStack = []
    let pendingForParen = -1
    let state = "code"
    let quote = ""
    let index = 0

    while (index < length) {
        const char = text[index]
        const next = index + 1 < length ? text[index + 1] : ""

        if (state === "line") {
            if (char === "\n") state = "code"
            index += 1
            continue
        }

        if (state === "block") {
            if (char === "*" && next === "/") {
                state = "code"
                index += 2
            } else {
                index += 1
            }
            continue
        }

        if (state === "string") {
            if (char === "\\") {
                index += 2
                continue
            }
            if (char === quote) state = "code"
            index += 1
            continue
        }

        if (state === "template") {
            if (char === "\\") {
                index += 2
                continue
            }
            if (char === "`") state = "code"
            index += 1
            continue
        }

        if (char === "/" && next === "/") {
            state = "line"
            index += 2
            continue
        }
        if (char === "/" && next === "*") {
            state = "block"
            index += 2
            continue
        }
        if (char === "'" || char === "\"") {
            state = "string"
            quote = char
            index += 1
            continue
        }
        if (char === "`") {
            state = "template"
            index += 1
            continue
        }

        if (index === pendingForParen) {
            forStack.push({ opens: ["("] })
            pendingForParen = -1
            index += 1
            continue
        }

        if (isIdentifierStart(char)) {
            let end = index + 1
            while (end < length && isIdentifierPart(text[end])) end += 1
            const word = text.slice(index, end)
            if (word === "for") {
                const before = index === 0 ? "" : text[index - 1]
                if (before !== ".") {
                    const cursor = skipSpaceAndComments(text, end)
                    if (text[cursor] === "(") pendingForParen = cursor
                }
            }
            index = end
            continue
        }

        if (forStack.length > 0) {
            const top = forStack[forStack.length - 1]
            if (char === "(" || char === "[" || char === "{") top.opens.push(char)
            if (char === ")" || char === "]" || char === "}") {
                top.opens.pop()
                if (top.opens.length === 0) forStack.pop()
            }
        }

        if (char === SEMICOLON) {
            const top = forStack.length > 0 ? forStack[forStack.length - 1] : null
            if (!top || top.opens.length !== 1) {
                const localLine = lineNumberAt(starts, index)
                const lineStart = starts[localLine - 1]
                const column = index - lineStart + 1
                violations.push(`${name}:${localLine + lineOffset}:${column}`)
            }
        }

        index += 1
    }
}

function fenceMarker(line) {
    let trimmed = line.trimStart()
    const bullet = trimmed.match(/^[-*+]\s+|^\d+[.)]\s+/)
    if (bullet) trimmed = trimmed.slice(bullet[0].length).trimStart()
    const char = trimmed[0]
    if (char !== "`" && char !== "~") return null
    let length = 0
    while (trimmed[length] === char) length += 1
    if (length < 3) return null
    return { char, length }
}

function isFenceClose(line, marker) {
    const trimmed = line.trimStart()
    let length = 0
    while (trimmed[length] === marker.char) length += 1
    return length >= marker.length && trimmed.slice(length).trim() === ""
}

function checkMarkdown(text, name) {
    const lines = text.split(/\r?\n/)
    let openFence = null
    let fenceStart = 0
    let buffer = []

    lines.forEach((line, index) => {
        const marker = fenceMarker(line)
        if (openFence === null) {
            if (marker !== null) {
                openFence = marker
                fenceStart = index
                buffer = []
            }
            return
        }
        if (isFenceClose(line, openFence)) {
            checkText(buffer.join("\n"), name, fenceStart + 1)
            openFence = null
            buffer = []
            return
        }
        buffer.push(line)
    })

    if (openFence !== null) checkText(buffer.join("\n"), name, fenceStart + 1)
}

for (const file of trackedFiles) {
    const text = readFileSync(file, "utf8")
    if (file.endsWith(".md")) checkMarkdown(text, file)
    else checkText(text, file, 0)
}

if (violations.length > 0) {
    console.error("Forbidden semicolons found")
    for (const violation of violations) console.error(violation)
    process.exit(1)
}

console.log(`No forbidden semicolons found in ${trackedFiles.length} files`)
