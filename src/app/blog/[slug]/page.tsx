import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getAllPosts, getPostBySlug } from "@/lib/blog-api"
import markdownToHtml from "@/lib/markdownToHtml"
import { BlogContainer, BlogHeader, PostBody, PostHeader } from "@/components/blog"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Footer from "@/components/landing/Footer"

type Params = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params

  try {
    const post = getPostBySlug(slug)

    return {
      title: `${post.title} - Luma Blog`,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        publishedTime: post.date,
        authors: [post.author.name],
        images: [
          {
            url: post.ogImage.url || post.coverImage,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.excerpt,
        images: [post.ogImage.url || post.coverImage],
      },
    }
  } catch {
    return {
      title: "Post Not Found - Luma Blog",
    }
  }
}

export async function generateStaticParams() {
  const posts = getAllPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params

  let post
  try {
    post = getPostBySlug(slug)
  } catch {
    notFound()
  }

  const content = await markdownToHtml(post.content)

  return (
    <div className="min-h-screen bg-light-gray">
      <BlogHeader />

      <main className="py-12 md:py-16">
        <BlogContainer>
          {/* Back Link */}
          <div className="mb-8">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-mint">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>

          <article>
            <PostHeader
              title={post.title}
              coverImage={post.coverImage}
              date={post.date}
              author={post.author}
              category={post.category}
            />
            <PostBody content={content} />
          </article>

          {/* Post Footer */}
          <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-sage-medium/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-600">
                Want to learn more about Luma?
              </p>
              <Link href="/signup">
                <Button>Start Your Free Trial</Button>
              </Link>
            </div>
          </div>
        </BlogContainer>
      </main>

      <Footer />
    </div>
  )
}
