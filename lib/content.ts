import type { IconName } from "@/lib/icons"
import { assetPath } from "@/lib/asset"

export type ContentImage = {
  src: string
  alt: string
}

export type NavItem = {
  href: string
  label: string
}

export type PracticeArea = {
  title: string
  shortDescription: string
  icon: IconName
  slug: string
  bullets: string[]
}

export type TeamMember = {
  name: string
  title: string
  bullets: string[]
  initials: string
  image?: ContentImage
}

export type PostBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

export type Post = {
  title: string
  slug: string
  date: string
  category: string
  excerpt: string
  image: ContentImage
  content: PostBlock[]
}

export type PrivacySection = {
  title: string
  items: string[]
}

export type MediaItem = {
  title: string
  outlet: string
  date: string
  format: "Συνέντευξη" | "Άρθρο" | "Βίντεο"
  href: string
  description: string
}

export type MediaSection = {
  title: string
  description?: string
  items: MediaItem[]
}

export type ProfileEntry = {
  title: string
  period?: string
  details: string[]
}

export type TeamProfile = {
  eyebrow: string
  title: string
  role: string
  summary: string[]
  experience: ProfileEntry[]
  education: ProfileEntry[]
  languages: string[]
  skills: string[]
  links: { label: string; href: string }[]
  image: ContentImage
}

export const site = {
  name: "Σουζάνα Κλημεντίδη",
  wordmark: {
    title: "Σουζάνα Κλημεντίδη",
    subtitle: "Δικηγορικό Γραφείο",
  },
  city: "Αθήνα",
  url: "https://kl1me.github.io/souzana",
  nav: [
    { href: "/practice-areas", label: "Τομείς" },
    { href: "/team", label: "Γραφείο" },
    { href: "/insights", label: "Άρθρα" },
    { href: "/media", label: "Μέσα" },
    { href: "/contact", label: "Επικοινωνία" },
  ] satisfies NavItem[],
  contact: {
    address: "Βασιλίσσης Σοφίας 12, 106 74 Αθήνα",
    hours: "Δευ–Παρ 09:00–18:00",
    phone: "",
    email: "contact@souzana-klimentidi.gr",
  },
  seo: {
    title: "Σουζάνα Κλημεντίδη | Αθήνα",
    description:
      "Δικηγορικό γραφείο στην Αθήνα με εμπειρία σε αφερεγγυότητα, τραπεζικό, ναυτιλιακό και επενδυτικό δίκαιο.",
  },
  legal: {
    footer: [
      "Η παρούσα ιστοσελίδα παρέχει γενική ενημέρωση και δεν συνιστά νομική συμβουλή.",
      "Η αποστολή μηνύματος δεν δημιουργεί σχέση εντολέα–δικηγόρου.",
    ],
    message:
      "Η αποστολή μηνύματος δεν δημιουργεί σχέση εντολέα–δικηγόρου.",
  },
}

export const home = {
  hero: {
    eyebrow: "ΑΘΗΝΑ",
    title: "Νομική στρατηγική με καθαρή κατεύθυνση",
    subtitle:
      "Υποστήριξη σε αφερεγγυότητα, τραπεζικό, ναυτιλιακό και επενδυτικό δίκαιο — με υπεύθυνη ενημέρωση σε κάθε στάδιο.",
    primaryCta: { label: "Κλείστε συνάντηση", href: "/contact" },
    secondaryCta: { label: "Οι τομείς μας", href: "/practice-areas" },
    trustLine: "Αρχική αξιολόγηση • Καθαρό πλαίσιο • Συνεχής ενημέρωση",
    credentials: [
      "Νομική σύμβουλος ΟΕΕ",
      "INSEAD",
      "University of Oxford",
      "MSc in Shipping",
    ],
    image: {
      src: assetPath("/images/hero.jpg"),
      alt: "Φωτεινός εσωτερικός χώρος γραφείου",
    },
  },
  practicePreview: {
    eyebrow: "Τομείς",
    title: "Τομείς με ουσιαστική εμπειρία",
    description: "Εστιασμένη υποστήριξη σε κρίσιμα εταιρικά και ιδιωτικά ζητήματα.",
    ctaLabel: "Δείτε όλους τους τομείς",
    ctaHref: "/practice-areas",
    image: {
      src: assetPath("/images/practice-1.jpg"),
      alt: "Βιβλία και σημειώσεις πάνω σε μαρμάρινο γραφείο",
    },
  },
  teamPreview: {
    eyebrow: "Γραφείο",
    title: "Η ομάδα πίσω από κάθε υπόθεση",
    description:
      "Προσωπική επίβλεψη και δίκτυο εξειδικευμένων συνεργατών, ανάλογα με τις ανάγκες κάθε υπόθεσης.",
    ctaLabel: "Δείτε το γραφείο",
    ctaHref: "/team",
  },
  trust: {
    eyebrow: "Τρόπος δουλειάς",
    title: "Μεθοδική προσέγγιση και συνέπεια",
    description: "Ένα προβλέψιμο πλαίσιο συνεργασίας από την πρώτη επαφή.",
    bullets: [
      "Αξιολόγηση δεδομένων, επιλογών και ουσιωδών κινδύνων.",
      "Συμφωνία σε στρατηγική, προτεραιότητες και επόμενα βήματα.",
      "Συστηματική ενημέρωση και τεκμηρίωση σε κάθε στάδιο.",
    ],
    ctaLabel: "Δείτε τα άρθρα μας",
    ctaHref: "/insights",
  },
  finalCta: {
    title: "Ας ξεκινήσουμε με μια σύντομη συζήτηση",
    description:
      "Περιγράψτε συνοπτικά το ζήτημά σας για να οργανώσουμε το κατάλληλο επόμενο βήμα.",
    ctaLabel: "Κλείστε συνάντηση",
    ctaHref: "/contact",
  },
}

export const practiceAreas: PracticeArea[] = [
  {
    title: "Εταιρικό Δίκαιο & Συμβάσεις",
    shortDescription:
      "Σύναψη και έλεγχος συμβάσεων με έμφαση στη σαφήνεια και τη διαχείριση ρίσκου.",
    icon: "Briefcase",
    slug: "corporate-contracts",
    bullets: [
      "Σύνταξη και έλεγχος συμβάσεων",
      "Συμφωνίες συνεργασίας και προμηθειών",
      "Σταθερή νομική υποστήριξη",
    ],
  },
  {
    title: "Ακίνητα & Μισθώσεις",
    shortDescription:
      "Νομικός έλεγχος και ασφαλείς συμφωνίες για επαγγελματικά και ιδιωτικά ακίνητα.",
    icon: "Landmark",
    slug: "real-estate-leases",
    bullets: [
      "Έλεγχος τίτλων και βαρών",
      "Μισθώσεις επαγγελματικών χώρων",
      "Συμβάσεις αγοραπωλησίας",
    ],
  },
  {
    title: "Εργατικό Δίκαιο",
    shortDescription:
      "Υποστήριξη σε εργασιακές σχέσεις με έμφαση στη συμμόρφωση και την τεκμηρίωση.",
    icon: "Users",
    slug: "employment",
    bullets: [
      "Συμβάσεις εργασίας",
      "Εσωτερικοί κανονισμοί",
      "Διαχείριση διαφορών",
    ],
  },
  {
    title: "Αστικό Δίκαιο & Διαφορές",
    shortDescription:
      "Στρατηγική διαχείριση διαφορών με προετοιμασία και τεκμηρίωση.",
    icon: "Gavel",
    slug: "civil-disputes",
    bullets: [
      "Απαιτήσεις και οφειλές",
      "Διαπραγμάτευση πριν τη δίκη",
      "Δικαστική εκπροσώπηση",
    ],
  },
  {
    title: "Οικογενειακό Δίκαιο",
    shortDescription:
      "Διακριτική υποστήριξη σε ευαίσθητα οικογενειακά ζητήματα.",
    icon: "Handshake",
    slug: "family-law",
    bullets: [
      "Συναινετικά διαζύγια",
      "Ρυθμίσεις επικοινωνίας",
      "Συμφωνίες γονικής μέριμνας",
    ],
  },
  {
    title: "Κανονιστική Συμμόρφωση & GDPR",
    shortDescription:
      "Πρακτικές διαδικασίες συμμόρφωσης με έμφαση στη λειτουργικότητα.",
    icon: "ShieldCheck",
    slug: "compliance-gdpr",
    bullets: [
      "Χαρτογράφηση δεδομένων",
      "Πολιτικές απορρήτου",
      "Εκπαίδευση ομάδων",
    ],
  },
]

export const teamMembers: TeamMember[] = [
  {
    name: "Ναταλία Θεοδώρου",
    title: "Συνεργάτιδα",
    bullets: [
      "Εταιρικό & εμπορικό δίκαιο",
      "Συμβάσεις και εταιρική συμμόρφωση",
      "Ελληνικά, Αγγλικά",
    ],
    initials: "ΝΘ",
  },
  {
    name: "Ιωάννα Λύκου",
    title: "Συνεργάτιδα",
    bullets: ["Αστικό δίκαιο", "Διαφορές & διαμεσολάβηση", "Ελληνικά, Αγγλικά"],
    initials: "ΙΛ",
    image: {
      src: assetPath("/images/team-3.jpg"),
      alt: "Πορτρέτο της Ιωάννας Λύκου",
    },
  },
  {
    name: "Ειρήνη Καραλή",
    title: "Συνεργάτιδα",
    bullets: ["Ακίνητα", "Μισθώσεις", "Ελληνικά, Αγγλικά"],
    initials: "ΕΚ",
    image: {
      src: assetPath("/images/team-4.jpg"),
      alt: "Πορτρέτο της Ειρήνης Καραλή",
    },
  },
]

export const posts: Post[] = [
  {
    title: "Τι να προσέξετε πριν υπογράψετε μια σύμβαση",
    slug: "symvasi-prin-ypografi",
    date: "2025-12-03",
    category: "Συμβάσεις",
    excerpt:
      "Τρία σημεία που μειώνουν παρερμηνείες και ενισχύουν τη σαφήνεια.",
    image: {
      src: assetPath("/images/insights-1.jpg"),
      alt: "Βιβλία και σημειώσεις πάνω σε μαρμάρινο γραφείο",
    },
    content: [
      {
        type: "paragraph",
        text: "Μια σύμβαση είναι χρήσιμη όταν είναι καθαρή, εφαρμόσιμη και συμβατή με την πραγματική συνεργασία.",
      },
      { type: "heading", level: 2, text: "Ορισμοί και ρόλοι" },
      {
        type: "paragraph",
        text: "Ορίστε με σαφήνεια τους ρόλους, τα αντικείμενα και τις ευθύνες των μερών.",
      },
      {
        type: "list",
        items: [
          "Περιγράψτε το αντικείμενο χωρίς ασάφειες",
          "Καθορίστε ευθύνες και προθεσμίες",
          "Ορίστε μηχανισμούς τροποποίησης",
        ],
      },
      { type: "heading", level: 2, text: "Λύση και αποχώρηση" },
      {
        type: "paragraph",
        text: "Προβλέψτε καθαρούς όρους λύσης ώστε να μειωθεί το ρίσκο σύγκρουσης.",
      },
    ],
  },
  {
    title: "Βασικά σημεία σε μισθώσεις επαγγελματικών ακινήτων",
    slug: "misthoseis-epaggelmatikon-akiniton",
    date: "2025-10-10",
    category: "Ακίνητα",
    excerpt: "Οι όροι που επηρεάζουν κόστος, διάρκεια και ευελιξία.",
    image: {
      src: assetPath("/images/insights-2.jpg"),
      alt: "Φωτεινό γραφειακό περιβάλλον με λιτή αισθητική",
    },
    content: [
      {
        type: "paragraph",
        text: "Οι μισθώσεις επηρεάζουν την καθημερινή λειτουργία μιας επιχείρησης και απαιτούν σαφή όρια.",
      },
      { type: "heading", level: 2, text: "Διάρκεια και αναπροσαρμογές" },
      {
        type: "paragraph",
        text: "Ορίστε πλαίσιο αναπροσαρμογής και ευελιξία σε περίπτωση μεταβολών.",
      },
      {
        type: "list",
        items: [
          "Ρήτρες πρόωρης λύσης",
          "Κατανομή εξόδων",
          "Χρόνος παράδοσης",
        ],
      },
    ],
  },
  {
    title: "Πρακτικά βήματα σε εργατική διαφορά: τι ισχύει",
    slug: "ergatiki-diafora-vimata",
    date: "2025-09-12",
    category: "Εργατικό",
    excerpt: "Σύντομος οδηγός για ψύχραιμη αξιολόγηση και σωστή προετοιμασία.",
    image: {
      src: assetPath("/images/insights-3.jpg"),
      alt: "Βιβλία και σημειώσεις πάνω σε μαρμάρινο γραφείο",
    },
    content: [
      {
        type: "paragraph",
        text: "Η ψύχραιμη αξιολόγηση και η σωστή τεκμηρίωση είναι τα πρώτα βήματα σε μια εργατική διαφορά.",
      },
      { type: "heading", level: 2, text: "Συλλογή στοιχείων" },
      {
        type: "paragraph",
        text: "Καταγράψτε χρονολόγιο, βασικά γεγονότα και σχετικά έγγραφα.",
      },
      {
        type: "list",
        items: [
          "Χρονολογική αποτύπωση",
          "Σχετική αλληλογραφία",
          "Εκτίμηση πιθανών εκβάσεων",
        ],
      },
    ],
  },
]

export const pages = {
  practice: {
    eyebrow: "Τομείς",
    title: "Τομείς με εξειδίκευση και ουσιαστική υποστήριξη",
    description:
      "Στοχευμένη νομική υποστήριξη για επιχειρήσεις και ιδιώτες, με έμφαση στην πρόληψη κινδύνων και στην εφαρμόσιμη λύση.",
    ctaTitle: "Ας συζητήσουμε το κατάλληλο επόμενο βήμα",
    ctaDescription:
      "Στείλτε μήνυμα για μια αρχική αξιολόγηση με σαφές πλαίσιο και χρονοδιάγραμμα.",
    ctaLabel: "Επικοινωνία",
    ctaHref: "/contact",
  },
  team: {
    eyebrow: "Γραφείο",
    title: "Το γραφείο",
    description: "Προσωπική επίβλεψη, διεθνής εκπαίδευση και συντονισμένο δίκτυο συνεργατών.",
    profile: {
      eyebrow: "Προφίλ",
      title: "Σουζάνα Κλημεντίδη",
      role: "Δικηγόρος – Managing Partner",
      summary: [
        "Managing Partner του γραφείου με έδρα την Αθήνα.",
        "Εξειδίκευση σε αφερεγγυότητα, τραπεζικό, ναυτιλιακό και επενδυτικό δίκαιο.",
        "Νομική σύμβουλος του Οικονομικού Επιμελητηρίου Ελλάδος.",
        "Συχνές παρεμβάσεις σε τηλεόραση και ραδιόφωνο.",
      ],
      experience: [
        {
          title: "Δικηγορικό Γραφείο Σουζάνα Κλημεντίδη",
          period: "08/2014 – σήμερα",
          details: [
            "Ναυτιλιακό, εταιρικό, τραπεζικό και διεθνές δίκαιο.",
            "Υποθέσεις εσωτερικής δικαιοδοσίας.",
          ],
        },
        {
          title: "Coral Shipping Corp",
          period: "09/2012 – 08/2014",
          details: [
            "Εταιρικό, διεθνές και εμπορικό δίκαιο.",
            "Ασφάλειες, συμβάσεις, απαιτήσεις και ναυλώσεις.",
          ],
        },
        {
          title: "D. Tsilivaraki & Partners Boutique Law Firm",
          period: "01/2008 – 04/2011",
          details: ["Ενασχόληση με αστικό και ποινικό δίκαιο."],
        },
      ],
      education: [
        {
          title: "INSEAD",
          period: "2021 – 2022",
          details: [
            "Executive Education – International Directors Programme (Corporate Governance).",
          ],
        },
        {
          title: "University of Oxford",
          period: "2021",
          details: ["Executive Education – Bank Governance."],
        },
        {
          title: "University of Piraeus",
          period: "2010 – 2012",
          details: ["MSc in Shipping."],
        },
        {
          title: "Εθνικό & Καποδιστριακό Πανεπιστήμιο Αθηνών",
          period: "2004 – 2008",
          details: ["Πτυχίο Νομικής."],
        },
      ],
      languages: [
        "Ελληνικά",
        "Αγγλικά",
        "Γαλλικά",
        "Κινέζικα",
        "Αραβικά",
      ],
      skills: [
        "Αφερεγγυότητα",
        "Τραπεζικό δίκαιο",
        "Ναυτιλιακό δίκαιο",
        "Επενδυτικό δίκαιο",
      ],
      links: [
        {
          label: "LinkedIn",
          href: "https://www.linkedin.com/in/souzana-klimentidi-64868662",
        },
      ],
      image: {
        src: assetPath("/images/team-1.jpg"),
        alt: "Πορτρέτο της Σουζάνα Κλημεντίδη",
      },
    } satisfies TeamProfile,
  },
  insights: {
    eyebrow: "Άρθρα",
    title: "Νομικά σημειώματα με πρακτική αξία",
    description: "Σύντομες αναλύσεις για κρίσιμα νομικά ζητήματα.",
    note:
      "Το παρόν κείμενο είναι ενημερωτικό και δεν συνιστά νομική συμβουλή.",
    relatedLabel: "Σχετικά άρθρα",
  },
  media: {
    eyebrow: "Μέσα",
    title: "Συνεντεύξεις & δημόσιες παρεμβάσεις",
    description: "Επιλεγμένες εμφανίσεις και κείμενα σε τρίτα μέσα ενημέρωσης.",
    note: "Οι σύνδεσμοι οδηγούν σε εξωτερικούς ιστότοπους.",
  },
  contact: {
    eyebrow: "Επικοινωνία",
    title: "Επικοινωνήστε για μια πρώτη αξιολόγηση",
    description:
      "Περιγράψτε συνοπτικά το ζήτημά σας και συνεχίστε με ασφαλή αποστολή από την εφαρμογή email σας.",
    consentText: "Με την αποστολή συμφωνείτε με την",
    successMessage:
      "Η εφαρμογή email άνοιξε με έτοιμο το μήνυμά σας. Ελέγξτε το και πατήστε αποστολή.",
    officeImage: {
      src: assetPath("/images/office.jpg"),
      alt: "Φωτεινός χώρος γραφείου",
    },
  },
  privacy: {
    title: "Πολιτική Απορρήτου",
    intro:
      "Ενημέρωση για τα στοιχεία που επιλέγετε να μας αποστείλετε και τον τρόπο διαχείρισής τους.",
    sections: [
      {
        title: "Υπεύθυνος επικοινωνίας",
        items: [
          "Δικηγορικό Γραφείο Σουζάνα Κλημεντίδη",
          "Για ερωτήσεις απορρήτου μπορείτε να χρησιμοποιήσετε το email επικοινωνίας του γραφείου.",
        ],
      },
      {
        title: "Τι συλλέγουμε",
        items: [
          "Ονοματεπώνυμο και στοιχεία επικοινωνίας",
          "Πληροφορίες που μας στέλνετε μέσω της φόρμας",
        ],
      },
      {
        title: "Γιατί χρησιμοποιούμε τα στοιχεία",
        items: [
          "Για να απαντήσουμε στο αίτημά σας",
          "Για να αξιολογήσουμε αν μπορούμε να αναλάβουμε την υπόθεση",
        ],
      },
      {
        title: "Τι συμβαίνει στη φόρμα",
        items: [
          "Η ιστοσελίδα δεν αποθηκεύει τα πεδία της φόρμας σε δικό της διακομιστή.",
          "Με την επιλογή αποστολής ανοίγει η εφαρμογή email της συσκευής σας, ώστε να ελέγξετε και να αποστείλετε εσείς το μήνυμα.",
        ],
      },
      {
        title: "Πόσο το κρατάμε",
        items: [
          "Μόνο για όσο απαιτείται για την επικοινωνία και τη νόμιμη τεκμηρίωση",
        ],
      },
      {
        title: "Δικαιώματα χρήστη",
        items: [
          "Πρόσβαση, διόρθωση ή διαγραφή των δεδομένων",
          "Επικοινωνία για οποιοδήποτε αίτημα",
        ],
      },
      {
        title: "Επικοινωνία",
        items: [
          "Για ερωτήσεις σχετικά με το απόρρητο, επικοινωνήστε στο contact@souzana-klimentidi.gr.",
        ],
      },
    ] satisfies PrivacySection[],
  },
}

export const media = {
  sections: [
    {
      title: "Τηλεόραση & βίντεο",
      description: "Εμφανίσεις και δηλώσεις σε τηλεοπτικά ή online μέσα.",
      items: [
        {
          title:
            "Πλειστηριασμός: Ποιοι θεωρούνται ευάλωτοι οφειλέτες – Πώς μπορούν να τον αποτρέψουν",
          outlet: "MEGA TV",
          date: "2022-06-16",
          format: "Βίντεο",
          href: "https://www.megatv.com/2022/06/16/pleistiriasmos-ti-mporoun-na-kanoun-oi-eyalotoi-polites-gia-na-ton-apotrepsoun/",
          description:
            "Τηλεοπτικό απόσπασμα με αναφορά στην προστασία ευάλωτων οφειλετών.",
        },
        {
          title: "Η Σουζάνα Κλημεντίδη για την προστασία της πρώτης κατοικίας",
          outlet: "Mesogeios TV",
          date: "2019-12-08",
          format: "Βίντεο",
          href: "https://www.mesogeiostv.gr/i-soyzana-klimentidi-gia-tin-prostasi/",
          description:
            "Σύντομη παρέμβαση για τις ρυθμίσεις προστασίας της πρώτης κατοικίας.",
        },
      ],
    },
    {
      title: "Άρθρα & αρθρογραφία",
      description: "Κείμενα με πρακτικές νομικές επισημάνσεις.",
      items: [
        {
          title:
            "Stalking και προστασία της προσωπικότητας: Η νομική αντίκρουση της επίμονης παρακολούθησης",
          outlet: "Dikastiko.gr",
          date: "2025-12-01",
          format: "Άρθρο",
          href: "https://www.dikastiko.gr/rota-ton-dikigoro-sou/soyzana-klimentidi-stalking-kai-prostasia-tis-prosopikotitas-i-nomiki-antikroysi-tis-epimonis-parakoloythisis/",
          description:
            "Νομική ανάλυση για το θεσμικό πλαίσιο κατά του stalking.",
        },
        {
          title:
            "Οι παρεπόμενες υποχρεώσεις των συμβάσεων – Η περίπτωση της ποινικής ρήτρας",
          outlet: "Dikastiko.gr",
          date: "2023-02-10",
          format: "Άρθρο",
          href: "https://www.dikastiko.gr/rota-ton-dikigoro-sou/soyzana-klimentidi-oi-parepomenes-ypochreoseis-ton-symvaseon-i-periptosi-tis-poinikis-ritras/",
          description:
            "Ανάλυση για τις παρεπόμενες συμβατικές υποχρεώσεις και την ποινική ρήτρα.",
        },
        {
          title:
            "Δικαστική Συμπαράσταση – Ένας αλληλέγγυος θεσμός του ιδιωτικού δικαίου",
          outlet: "Dikastiko.gr",
          date: "2022-07-11",
          format: "Άρθρο",
          href: "https://www.dikastiko.gr/rota-ton-dikigoro-sou/soyzana-klimentidi-dikastiki-symparastasi-enas-allileggyos-thesmos-toy-idiotikoy-dikaioy/",
          description:
            "Νομική ανάλυση για τον θεσμό της δικαστικής συμπαράστασης.",
        },
        {
          title:
            "Πρώτη κατοικία: Υπάρχει λύση για την προστασία των οικονομικά αδύναμων οφειλετών;",
          outlet: "Enikos.gr",
          date: "2020-02-10",
          format: "Άρθρο",
          href: "https://www.enikos.gr/economy/701457/proti-katoikia-yparchei-lysi-gia-tin-prostasia-ton-oikonomika-ady",
          description:
            "Ανάλυση για την προστασία της πρώτης κατοικίας υπό το νέο πτωχευτικό πλαίσιο.",
        },
        {
          title: "Ο ηλικιακός ρατσισμός στην Ελλάδα και οι νέοι βουλευτές",
          outlet: "ATHENS VOICE",
          date: "2023-07-04",
          format: "Άρθρο",
          href: "https://www.athensvoice.gr/epikairotita/politiki-oikonomia/807596/o-ilikiakos-ratsismos-stin-ellada-kai-oi-neoi-vouleutes/",
          description: "Συνοπτικό κείμενο για κοινωνικά και θεσμικά ζητήματα.",
        },
        {
          title:
            "Πλειστηριασμοί: Στο σφυρί η πρώτη κατοικία της μεσαίας τάξης",
          outlet: "Dikastiko.gr",
          date: "2022-05-12",
          format: "Άρθρο",
          href: "https://www.dikastiko.gr/eidhsh/sto-sfyri-i-proti-katoikia-tis-mesaias-taxis-spiti-dimosion-ypallilon-me-3-anilika-paidia-vgainei-se-pleistiriasmo-i-nomiki-akampsia/",
          description:
            "Αναφορά στην νομική ακαμψία και τους πλειστηριασμούς πρώτης κατοικίας.",
        },
      ],
    },
    {
      title: "Συνεντεύξεις",
      description: "Συνεντεύξεις σε έντυπα και ψηφιακά μέσα.",
      items: [
        {
          title:
            "Σουζάνα Κλημεντίδη: «Μπορούμε να μην είμαστε τέλειες, αλλά δικαιούμαστε να διεκδικούμε το καλύτερο»",
          outlet: "ELLE Greece",
          date: "2025-10-24",
          format: "Συνέντευξη",
          href: "https://www.elle.gr/lifestyle/712042/souzana-klimentidi-mporoume-na-min-eimaste-teleies-alla-dikaioumaste-na-diekdikoume-to-kalutero-gia-ton-eauto-mas",
          description:
            "Συνέντευξη στο ELLE.gr με έμφαση στη διαδρομή και τις επαγγελματικές αξίες.",
        },
        {
          title:
            "Σουζάνα Κλημεντίδη: Χρειάζεται να διανύσουμε ακόμη πολύ δρόμο για να μάθουμε στις γυναίκες να έχουν αυτοπεποίθηση",
          outlet: "Fortune Greece",
          date: "2024-05-24",
          format: "Συνέντευξη",
          href: "https://www.fortunegreece.com/interview/souzana-klimentidi-xreiazetai-na-dianisoume-akomi-poli-dromo-gia-na-mathoume-stis-ginaikes-na-exoun-aftopepoithisi/",
          description:
            "Συνέντευξη για τη γυναικεία ηγεσία και την αυτοπεποίθηση στον επαγγελματικό χώρο.",
        },
        {
          title:
            "Σουζάνα Κλημεντίδη: Το ESG πρέπει να συνάδει με το business plan των επιχειρήσεων",
          outlet: "Fortune Greece",
          date: "2023-07-08",
          format: "Συνέντευξη",
          href: "https://www.fortunegreece.com/interview/souzana-kli%C2%B5entidi-to-esg-prepei-na-sinadei-%C2%B5e-to-business-plan-ton-epixeiriseon/",
          description:
            "Συνέντευξη για το ESG, τα soft skills και τον ρόλο τους στη σύγχρονη επιχειρηματικότητα.",
        },
      ],
    },
    {
      title: "Podcasts & YouTube",
      description: "Συμμετοχές σε podcasts και ψηφιακά μέσα.",
      items: [
        {
          title:
            "Χτύπησε tattoo και ΑΠΟΛΥΘΗΚΕ! ft. Σουζάνα Κλημεντίδη",
          outlet: "Θα Σας Ειδοποιήσουμε",
          date: "2025-11-28",
          format: "Βίντεο",
          href: "https://www.youtube.com/watch?v=uVdbjyQUHUg",
          description:
            "Εργασιακά δικαιώματα, όρια διάκρισης και προστασία ιδιωτικής ζωής στον χώρο εργασίας.",
        },
        {
          title:
            "Bullying ΤΕΛΟΣ. Έρχονται ΚΑΤΑΓΓΕΛΙΕΣ! ft. Σουζάνα Κλημεντίδη",
          outlet: "Θα Σας Ειδοποιήσουμε",
          date: "2025-04-01",
          format: "Βίντεο",
          href: "https://open.spotify.com/episode/6kUw0NijhElSN7YV4pQQ3D",
          description:
            "Συζήτηση για το εργασιακό bullying και τις νομικές διαστάσεις του.",
        },
        {
          title:
            "Σουζάνα Κλημεντίδη – Δικηγορικό Γραφείο ΑΑΚ & Συνεργάτες",
          outlet: "Startupper.gr",
          date: "2024-08-29",
          format: "Βίντεο",
          href: "https://www.youtube.com/watch?v=igy49HIgT5Y",
          description:
            "Η Σουζάνα Κλημεντίδη παρουσιάζει το γραφείο και μοιράζεται συμβουλές για startups.",
        },
        {
          title:
            "Ξεγυμνώνουμε τη Σουζάνα Κλημεντίδη!",
          outlet: "Θα Σας Ειδοποιήσουμε",
          date: "2024-06-28",
          format: "Βίντεο",
          href: "https://www.youtube.com/watch?v=78mgA6Iefvc",
          description:
            "Εργασιακά δικαιώματα, νοοτροπία εταιρειών και η πορεία μιας δικηγόρου.",
        },
      ],
    },
  ] satisfies MediaSection[],
}
