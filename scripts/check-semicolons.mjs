import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

const SEMICOLON = String.fromCharCode(59)
const checkedExtensions = new Set([".js", ".ts", ".mjs", ".cjs"])
const trackedFiles = execSync("git ls-files", { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
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
            forStack.push({ depth: 1 })
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
                    let cursor = end
                    while (cursor < length && /\s/.test(text[cursor])) cursor += 1
                    if (text[cursor] === "(") pendingForParen = cursor
                }
            }
            index = end
            continue
        }

        if (forStack.length > 0) {
            const top = forStack[forStack.length - 1]
            if (char === "(") top.depth += 1
            if (char === ")") {
                top.depth -= 1
                if (top.depth === 0) forStack.pop()
            }
        }

        if (char === SEMICOLON) {
            const top = forStack.length > 0 ? forStack[forStack.length - 1] : null
            if (!top || top.depth !== 1) {
                const localLine = lineNumberAt(starts, index)
                const lineStart = starts[localLine - 1]
                const column = index - lineStart + 1
                violations.push(`${name}:${localLine + lineOffset}:${column}`)
            }
        }

        index += 1
    }
}

function checkMarkdown(text, name) {
    const lines = text.split(/\r?\n/)
    let inFence = false
    let fenceStart = 0
    let buffer = []

    lines.forEach((line, index) => {
        const trimmed = line.trimStart()
        if (trimmed.startsWith("```")) {
            if (inFence) {
                checkText(buffer.join("\n"), name, fenceStart + 1)
                buffer = []
                inFence = false
            } else {
                inFence = true
                fenceStart = index
                buffer = []
            }
            return
        }
        if (inFence) buffer.push(line)
    })

    if (inFence) checkText(buffer.join("\n"), name, fenceStart + 1)
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
