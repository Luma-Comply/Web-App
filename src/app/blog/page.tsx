import { Metadata } from "next"
import { getAllPosts } from "@/lib/blog-api"
import { BlogContainer, BlogHeader, HeroPost, MoreStories } from "@/components/blog"
import Footer from "@/components/landing/Footer"

export const metadata: Metadata = {
  title: "Blog - Luma",
  description:
    "Insights on medical necessity documentation, prior authorizations, HIPAA compliance, and healthcare administration.",
}

export default function BlogPage() {
  const allPosts = getAllPosts()

  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1)

  return (
    <div className="min-h-screen bg-light-gray">
      <BlogHeader />

      <main className="py-16 md:py-24">
        <BlogContainer>
          {/* Page Header */}
          <div className="mb-16 md:mb-20">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-semibold text-dark-bg mb-6">
              Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Insights on medical necessity documentation, prior authorizations, HIPAA
              compliance, and healthcare administration.
            </p>
          </div>

          {/* Posts */}
          {heroPost ? (
            <>
              <HeroPost
                title={heroPost.title}
                coverImage={heroPost.coverImage}
                date={heroPost.date}
                author={heroPost.author}
                slug={heroPost.slug}
                excerpt={heroPost.excerpt}
                category={heroPost.category}
              />
              {morePosts.length > 0 && <MoreStories posts={morePosts} />}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-gray-600">
                No posts yet. Check back soon!
              </p>
            </div>
          )}
        </BlogContainer>
      </main>

      <Footer />
    </div>
  )
}
