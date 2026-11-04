import Image from "next/image"
import { biographyInitials } from "@/lib/team-biographies"
import type { DirectoryMember } from "@/lib/team-directory"

export default function TeamPortrait({ member, priority = false, sizes = "(min-width: 768px) 160px, 96px", gallery = false }: {
  member: DirectoryMember
  priority?: boolean
  sizes?: string
  gallery?: boolean
}) {
  return (
    <div className="team-portrait">
      {member.image ? (
        <Image src={member.image.src} alt={member.image.alt} fill priority={priority}
          sizes={sizes} className="object-cover object-[50%_30%]"
          style={gallery ? { transform: `scale(${member.image.galleryScale ?? 1})`, transformOrigin: "50% 20%" } : undefined} />
      ) : (
        <span aria-hidden="true">{biographyInitials(member.name)}</span>
      )}
    </div>
  )
}
