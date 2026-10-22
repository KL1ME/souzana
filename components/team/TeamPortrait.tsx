import Image from "next/image"
import { biographyInitials } from "@/lib/team-biographies"
import type { DirectoryMember } from "@/lib/team-directory"

export default function TeamPortrait({ member, priority = false }: { member: DirectoryMember; priority?: boolean }) {
  return (
    <div className="team-portrait">
      {member.image ? (
        <Image src={member.image.src} alt={member.image.alt} fill priority={priority}
          sizes="(min-width: 768px) 160px, 96px" className="object-cover object-[50%_30%]" />
      ) : (
        <span aria-hidden="true">{biographyInitials(member.name)}</span>
      )}
    </div>
  )
}
