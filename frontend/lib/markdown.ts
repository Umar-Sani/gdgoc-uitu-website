import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { PluggableList } from 'unified'

// Single source of truth for every <ReactMarkdown> in the app, so user-authored content
// (forum threads and replies, the editor preview, CMS text) is sanitised the same way
// everywhere (TODO-020).
//
// react-markdown already drops raw HTML and blanks `javascript:` URLs by default. This
// adds an allow-list pass (GitHub's default schema) on top, so the protection does not
// depend on those defaults surviving — notably if someone later adds `rehype-raw`.
// KEEP rehypeSanitize LAST in any rehype plugin list: anything after it is unsanitised.
export const markdownRemarkPlugins: PluggableList = [remarkGfm]
export const markdownRehypePlugins: PluggableList = [rehypeSanitize]
