import { notFound } from "next/navigation"
import BiographyDetail from "@/components/team/BiographyDetail"
import { directoryMembers, memberPath } from "@/lib/team-directory"
import { createPageMetadata } from "@/lib/metadata"

export const dynamicParams = false

export function generateStaticParams() {
  return directoryMembers.map((member) => ({ slug: member.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const member = directoryMembers.find((person) => person.id === slug)
  if (!member) notFound()
  return { ...createPageMetadata(member.name, member.role || member.name, memberPath(slug)) }
}

export default async function TeamMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BiographyDetail id={slug} />
}
