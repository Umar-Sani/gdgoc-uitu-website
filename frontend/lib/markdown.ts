import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { defaultUrlTransform } from 'react-markdown'
import type { PluggableList } from 'unified'

// Single source of truth for every <ReactMarkdown> in the app, so user-authored content
// (forum threads and replies, the editor preview, CMS text) is sanitised the same way
// everywhere (TODO-020).
//
// react-markdown already drops raw HTML and blanks `javascript:` URLs by default. This
// adds an allow-list pass (GitHub's default schema) on top, so the protection does not
// depend on those defaults surviving — notably if someone later adds `rehype-raw`.
// KEEP rehypeSanitize LAST in any rehype plugin list: anything after it is unsanitised.
//
// @mentions: pages rewrite `@name` to `[@name](mention:name)` and render `mention:` links
// as pills. Both react-markdown's URL transform and the sanitize schema strip unknown
// protocols, so `mention:` is allowed explicitly — but only in the exact shape the
// rewrite produces (`mention:` + a plain username), never a path like `mention:../x`.
const MENTION_URL = /^mention:[A-Za-z0-9_]{1,30}$/

export function markdownUrlTransform(url: string): string {
  return MENTION_URL.test(url) ? url : defaultUrlTransform(url)
}

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), 'mention'],
  },
}

export const markdownRemarkPlugins: PluggableList = [remarkGfm]
export const markdownRehypePlugins: PluggableList = [[rehypeSanitize, sanitizeSchema]]
