import fs from "fs"
import { join } from "path"
import matter from "gray-matter"
import { Post } from "@/interfaces/post"

const postsDirectory = join(process.cwd(), "_posts")

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }
  return fs.readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.startsWith("BLOG_")) // Exclude guideline files
}

export function getPostBySlug(slug: string): Post {
  const realSlug = slug.replace(/\.md$/, "")
  const fullPath = join(postsDirectory, `${realSlug}.md`)
  const fileContents = fs.readFileSync(fullPath, "utf8")
  const { data, content } = matter(fileContents)

  return {
    slug: realSlug,
    title: data.title || "",
    date: data.date || "",
    coverImage: data.coverImage || "",
    author: data.author || { name: "", picture: "" },
    excerpt: data.excerpt || "",
    ogImage: data.ogImage || { url: "" },
    content,
    category: data.category || "General",
  }
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs()
  const now = new Date()

  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    // Filter out future posts
    .filter((post) => new Date(post.date) <= now)
    // Sort by date descending
    .sort((post1, post2) => (new Date(post1.date) > new Date(post2.date) ? -1 : 1))

  return posts
}
