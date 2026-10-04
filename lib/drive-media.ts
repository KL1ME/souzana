import { assetPath } from "@/lib/asset"
import type { MediaSection } from "@/lib/content"

export const driveMediaSections: MediaSection[] = [
  {
    title: "Συνέδρια & επιστημονικές παρεμβάσεις",
    description: "Συμμετοχές σε επιστημονικές και επαγγελματικές συναντήσεις.",
    items: [
      {
        title: "3ο Συνέδριο Κοχλίας — Ο πατέρας απέναντι από τον νόμο",
        outlet: "Κοχλίας",
        date: "2026-10-09",
        dateLabel: "9–11 Οκτωβρίου 2026",
        format: "Ομιλία",
        href: "https://kochlias-mertzani.gr/wp-content/uploads/2026/08/κλιμεντίδη-περιλιψη-ο-πατέρας-απέναντι-στον-νόμο_από-την-πατριαρχική-εξουσία-στη-γονεϊκότητα-της-φροντίδας.docx.pdf",
        linkLabel: "Διαβάστε την περίληψη",
        description:
          "Ομιλία της Σουζάνας Κλημεντίδη στις 9 Οκτωβρίου, 18:30–19:00, στο Πανεπιστήμιο Δυτικής Αττικής, με δυνατότητα διαδικτυακής παρακολούθησης. Θέμα η εξέλιξη της πατρότητας και η γονεϊκότητα της φροντίδας.",
        image: {
          src: assetPath("/images/media/kochlias-2026.webp"),
          alt: "Ανακοίνωση της ομιλίας της Σουζάνας Κλημεντίδη στο 3ο Συνέδριο Κοχλίας",
          fit: "contain",
        },
      },
      {
        title: "3ο Legal Business Summit",
        outlet: "BOUSSIAS Events",
        date: "2026-05-28",
        dateLabel: "28–29 Μαΐου 2026",
        format: "Συνέδριο",
        href: "https://legalsummit.boussiasevents.gr/#sponsors",
        linkLabel: "Δείτε τον διοργανωτή και τους χορηγούς",
        description:
          "Συμμετοχή της εταιρείας ως Gold Sponsor στο 3ο Legal Business Summit, που πραγματοποιήθηκε στις 28–29 Μαΐου 2026 στο Grecotel La Riviera.",
        image: {
          src: assetPath("/images/media/legal-business-summit-2026.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στο 3ο Legal Business Summit",
        },
      },
      {
        title: "1ο Συνέδριο Ιδιωτικού Χρέους Φυσικών & Νομικών Προσώπων",
        outlet: "Νομική Βιβλιοθήκη",
        date: "2026-01-31",
        format: "Συνέδριο",
        href: "https://www.nb.org/1o-sunedrio-idiotiko-chreos-fysikon-nomikon-prosopon-info#agenda",
        image: {
          src: assetPath("/images/media/private-debt-conference-2026.webp"),
          alt: "Πορτρέτο της Σουζάνας Κλημεντίδη στο επίσημο πρόγραμμα του 1ου Συνεδρίου Ιδιωτικού Χρέους",
          position: "50% 0%",
        },
        linkLabel: "Δείτε το πρόγραμμα του συνεδρίου",
        description:
          "Εισήγηση της Σουζάνας Κλημεντίδη στη θεματική ενότητα για τον εξωδικαστικό μηχανισμό, με αντικείμενο την προστασία των ευάλωτων και επιλέξιμων οφειλετών.",
      },
      {
        title: "2ο Συνέδριο Κοχλίας — Η νομική προστασία της ψυχικής υγείας και της αναπηρίας",
        outlet: "Κοχλίας",
        date: "2025-10-10",
        dateLabel: "10–11 Οκτωβρίου 2025",
        format: "Ομιλία",
        href: "https://kochlias-mertzani.gr/2026/04/17/2o-diethnes-diepistimoniko-yvridiko-synedrio-psychikis-ygeias/",
        image: {
          src: assetPath("/images/media/kochlias-2025.webp"),
          alt: "Ανακοίνωση του 2ου Διεθνούς Διεπιστημονικού Υβριδικού Συνεδρίου Ψυχικής Υγείας, 10–11 Οκτωβρίου 2025",
          fit: "contain",
        },
        linkLabel: "Πληροφορίες για το συνέδριο",
        description:
          "Εισήγηση της Σουζάνας Κλημεντίδη «Η νομική προστασία της ψυχικής υγείας και της αναπηρίας: Από τη θεωρία στην πράξη», στο Πανεπιστήμιο Δυτικής Αττικής.",
      },
      {
        title: "17ο Πανελλήνιο Συνέδριο Δικηγόρων Νομικών Υπηρεσιών",
        outlet: "Νομική Βιβλιοθήκη",
        date: "2025-07-03",
        format: "Συνέδριο",
        href: "https://www.nb.org/17o-panellinio-sinedrio-dikigoron-nomikon-iperesion-info#agenda",
        image: {
          src: assetPath("/images/media/legal-services-conference-2025.webp"),
          alt: "Πορτρέτο της Σουζάνας Κλημεντίδη στο επίσημο πρόγραμμα του 17ου Πανελλήνιου Συνεδρίου Δικηγόρων Νομικών Υπηρεσιών",
          position: "50% 0%",
        },
        linkLabel: "Δείτε το πρόγραμμα του συνεδρίου",
        description:
          "Στο επίσημο πρόγραμμα η Σουζάνα Κλημεντίδη αναφέρεται ως συμμετέχουσα στο πάνελ «Από τη Συμμόρφωση στη Συνείδηση: Η Εταιρική Διακυβέρνηση σε Μετάβαση», στο Μέγαρο Μουσικής Αθηνών.",
      },
    ],
  },
  {
    title: "Οικογένεια, εργασία & δικαιώματα",
    description: "Νομική ενημέρωση με τη Σουζάνα Κλημεντίδη στο The Mamagers.",
    items: [
      {
        title: "Είσαι single μαμά; Αυτά είναι τα 3 δικαιώματα που ίσως αγνοείς",
        outlet: "The Mamagers",
        date: "2026-07-29",
        format: "Άρθρο",
        href: "https://www.themamagers.gr/family/505379/eisai-single-mama-auta-einai-ta-3-dikaiomata-pou-isos-agnoeis",
        image: {
          src: assetPath("/images/media/mamagers-single-mother.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στο βίντεο του The Mamagers για τα δικαιώματα των single μαμάδων",
          fit: "contain",
        },
        linkLabel: "Δείτε το άρθρο",
        description:
          "Η Σουζάνα Κλημεντίδη εξηγεί τις άδειες, τις διευκολύνσεις και τις κοινωνικές παροχές που αφορούν τις μητέρες μονογονεϊκών οικογενειών.",
      },
      {
        title: "Συνεπιμέλεια: Πρέπει το παιδί να μοιράζει τον χρόνο του 50–50 μεταξύ των γονέων;",
        outlet: "The Mamagers",
        date: "2026-07-27",
        format: "Άρθρο",
        href: "https://www.themamagers.gr/family/505329/sunepimeleia-prepei-to-paidi-na-moirazei-ton-xrono-tou-50-50-metaxu-ton-goneon",
        image: {
          src: assetPath("/images/media/mamagers-shared-custody.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στο βίντεο του The Mamagers για τον χρόνο της συνεπιμέλειας",
          fit: "contain",
        },
        linkLabel: "Δείτε το άρθρο",
        description:
          "Παρέμβαση για τη συνεπιμέλεια, την κατανομή του χρόνου με κάθε γονέα και τη σημασία των ιδιαίτερων αναγκών του παιδιού.",
      },
      {
        title: "Συνεπιμέλεια και διατροφή παιδιού: Τι ισχύει πραγματικά σύμφωνα με τον νόμο",
        outlet: "The Mamagers",
        date: "2026-07-09",
        format: "Άρθρο",
        href: "https://www.themamagers.gr/family/505243/sunepimeleia-kai-diatrofi-paidiou-ti-isxuei-pragmatika-sumfona-me-ton-nomo",
        image: {
          src: assetPath("/images/media/mamagers-child-support.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στο βίντεο του The Mamagers για τη συνεπιμέλεια και τη διατροφή παιδιού",
          fit: "contain",
        },
        linkLabel: "Δείτε το άρθρο",
        description:
          "Η Σουζάνα Κλημεντίδη αναλύει τη σχέση της συνεπιμέλειας με τη διατροφή και διαχωρίζει τη γονική μέριμνα από την κάλυψη των αναγκών του παιδιού.",
      },
      {
        title: "Έχω την αποκλειστική επιμέλεια, αλλά το κράτος δεν με θεωρεί παντού μονογονέα",
        outlet: "The Mamagers",
        date: "2026-06-28",
        format: "Συνέντευξη",
        href: "https://www.themamagers.gr/family/504696/exo-tin-apokleistiki-epimeleia-alla-to-kratos-den-me-theorei-pantou-monogonea-i-souzana-klimentidi-xedialunei-to-nomiko-paradoxo",
        image: {
          src: assetPath("/images/media/mamagers-single-parent.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στη συνέντευξή της στο The Mamagers για τη μονογονεϊκότητα",
        },
        linkLabel: "Διαβάστε τη συνέντευξη",
        description:
          "Συνέντευξη για την αποκλειστική επιμέλεια και τα διαφορετικά κριτήρια αναγνώρισης της μονογονεϊκότητας από δημόσιους φορείς και προγράμματα παροχών.",
      },
      {
        title: "Θέλω να μείνω έγκυος: Τι δεν δικαιούται να με ρωτήσει ο εργοδότης μου;",
        outlet: "The Mamagers",
        date: "2026-06-25",
        format: "Άρθρο",
        href: "https://www.themamagers.gr/family/505066/thelo-na-meino-egkuos-ti-den-dikaioutai-na-me-rotisei-o-ergodotis-mou",
        image: {
          src: assetPath("/images/media/mamagers-maternity-work.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στο βίντεο του The Mamagers για την προστασία της μητρότητας στην εργασία",
          fit: "contain",
        },
        linkLabel: "Δείτε το άρθρο",
        description:
          "Νομική ενημέρωση για την προστασία της μητρότητας στην εργασία, από τη συνέντευξη πρόσληψης έως την επιστροφή μετά τη γέννηση του παιδιού.",
      },
    ],
  },
  {
    title: "Δημοσιεύσεις στον Τύπο",
    description: "Συνεντεύξεις, άρθρα και ρεπορτάζ σε εφημερίδες και περιοδικά.",
    items: [
      {
        title: "Ανθρώπινο κεφάλαιο: Ο πολλαπλασιαστής της αξίας των επενδύσεων",
        outlet: "Η Καθημερινή",
        date: "2026-03-12",
        format: "Ρεπορτάζ",
        href: "https://www.kathimerini.gr/economy/564122251/anthropino-kefalaio-o-pollaplasiastis-tis-axias-ton-ependyseon/",
        image: {
          src: assetPath("/images/media/kathimerini-human-capital.webp"),
          alt: "Το πάνελ του Invest in Greece 2026 στη φωτογραφία του ρεπορτάζ της Καθημερινής",
        },
        linkLabel: "Διαβάστε το ρεπορτάζ στην Καθημερινή",
        description:
          "Ρεπορτάζ του Newsroom για το Invest in Greece 2026, με δηλώσεις της Σουζάνας Κλημεντίδη σχετικά με την επαγγελματική εξειδίκευση και την επένδυση στο ανθρώπινο δυναμικό.",
      },
      {
        title: "Δικηγορικές Εταιρείες: Το κλειδί για τη διαχείριση κινδύνων στο σύγχρονο επιχειρείν",
        outlet: "ΧΡΗΜΑ · τεύχος 479",
        dateLabel: "Νοέμβριος–Δεκέμβριος 2025",
        format: "Άρθρο",
        href: assetPath("/documents/xrima-479-article.pdf"),
        linkLabel: "Δείτε το άρθρο",
        description:
          "Άρθρο της Σουζάνας Κλημεντίδη για τη νομική υποστήριξη των επιχειρήσεων, την πρόληψη κινδύνων, τις συμβάσεις και την κανονιστική συμμόρφωση. Δημοσιεύθηκε στη σελίδα 13 του περιοδικού.",
        image: {
          src: assetPath("/images/media/souzana-portrait.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στη φωτογραφία του άρθρου της στο περιοδικό ΧΡΗΜΑ",
          position: "50% 15%",
        },
      },
      {
        title: "Η ανθρώπινη προσέγγιση είναι η ψυχή του επαγγέλματος",
        outlet: "LAWYER · τεύχος 39",
        dateLabel: "Ιούλιος–Αύγουστος 2025",
        format: "Συνέντευξη",
        href: assetPath("/documents/lawyer-39-interview.pdf"),
        linkLabel: "Διαβάστε τη συνέντευξη",
        description:
          "Συνέντευξη εξωφύλλου στην Αλεξάνδρα Βαρλά για τον δικηγόρο ως στρατηγικό σύμβουλο, την ενδυνάμωση των νέων γυναικών δικηγόρων και την τεχνολογία. Δημοσιεύθηκε στις σελίδες 10–13.",
        image: {
          src: assetPath("/images/media/lawyer-39-portrait.webp"),
          alt: "Η Σουζάνα Κλημεντίδη στη φωτογραφία της συνέντευξής της στο περιοδικό LAWYER",
          position: "50% 8%",
        },
      },
    ],
  },
]
