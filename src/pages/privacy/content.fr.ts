import type { PrivacyContent } from "./types";

/**
 * French is the reference text. If the three versions ever disagree, this one is
 * correct and the others are the ones that are wrong.
 */
export const privacyFr: PrivacyContent = {
  title: "Politique de confidentialité",
  lastUpdated: "Dernière mise à jour : octobre 2026",
  backLabel: "Retour à la connexion",
  intro:
    "Managiha est un logiciel de gestion de stock et de carnet de crédit destiné aux commerces de proximité. Cette page explique quelles données sont traitées, pourquoi, pendant combien de temps, et comment exercer vos droits.",
  sections: [
    {
      heading: "1. Responsable du traitement",
      paragraphs: [
        "Le responsable du traitement est l'exploitant du magasin qui utilise Managiha. C'est lui qui décide quelles données sont saisies et qui répond des demandes des personnes concernées.",
        "L'éditeur du logiciel n'accède pas aux données de votre magasin. Chaque magasin est isolé au niveau de la base de données par des règles de sécurité (RLS) : un compte ne peut lire et modifier que les données de son propre magasin.",
      ],
    },
    {
      heading: "2. Données traitées",
      bullets: [
        "Compte utilisateur : adresse e-mail, mot de passe (stocké sous forme de condensat par le service d'authentification, jamais en clair), nom complet et téléphone si vous les renseignez.",
        "Magasin : nom, adresse, téléphone, devise et langue.",
        "Catalogue : noms de produits, codes-barres, références, prix, seuils d'alerte, dates d'expiration, photographies.",
        "Mouvements de stock : type, quantité, motif, note, date, auteur.",
        "Carnet de crédit : nom du client, téléphone, note libre, montant des crédits et paiements, solde.",
        "Fournisseurs : nom, téléphone, numéro WhatsApp, adresse, notes.",
      ],
    },
    {
      heading: "3. Finalités et bases légales",
      bullets: [
        "Fournir le service demandé : gérer votre stock, votre carnet de crédit et vos rapports. Base : exécution du contrat.",
        "Assurer la sécurité du service : authentification, journalisation, prévention des abus. Base : intérêt légitime.",
        "Respecter vos obligations comptables : conservation des mouvements et des transactions. Base : obligation légale.",
      ],
      paragraphs: [
        "Aucune donnée n'est utilisée pour de la publicité, n'est vendue, ni cédée à des tiers. Le logiciel n'intègre aucun traceur publicitaire et aucun outil de mesure d'audience tiers.",
      ],
    },
    {
      heading: "4. Données des clients du magasin",
      paragraphs: [
        "Le carnet contient des données personnelles de vos clients (nom, téléphone, solde). Vous êtes responsable de ces données : vous devez les collecter pour un motif légitime, ne pas les conserver plus longtemps que nécessaire, et répondre aux demandes d'accès ou d'effacement qu'ils vous adressent.",
        "Managiha fournit les outils pour y répondre : export complet des données d'un client, et anonymisation de ses données personnelles tout en conservant les montants comptables. L'anonymisation est refusée tant que le solde n'est pas nul, car la créance constitue une preuve légitime pour le magasin.",
      ],
    },
    {
      heading: "5. Durée de conservation",
      bullets: [
        "Données de compte et de magasin : tant que le compte existe, puis supprimées sur demande.",
        "Mouvements de stock et transactions du carnet : conservés pour répondre aux obligations comptables, y compris après anonymisation des données personnelles.",
        "Photographies de produits : supprimées lorsque vous les remplacez ou archivez le produit.",
        "Journaux d'authentification : conservés par le service d'authentification pour la sécurité du service.",
      ],
    },
    {
      heading: "6. Destinataires et sous-traitants",
      paragraphs: [
        "Les données sont hébergées chez Supabase, qui fournit la base de données, l'authentification et le stockage des images, et agit comme sous-traitant. Aucun autre tiers n'a accès aux données.",
        "Les éventuels rapports d'erreurs techniques (service Sentry) ne sont activés que si l'exploitant du service les configure, et ne contiennent pas les données métier de votre magasin.",
      ],
    },
    {
      heading: "7. Transferts hors d'Algérie",
      paragraphs: [
        "La loi n° 18-07 encadre le transfert de données à caractère personnel vers l'étranger et exige, en principe, une autorisation de l'Autorité nationale de protection des données personnelles (ANPDP), ou un niveau de protection suffisant dans le pays de destination.",
        "L'hébergement retenu doit être vérifié au regard de cette exigence avant toute exploitation commerciale. Cette question n'est pas tranchée par le logiciel : elle doit être confirmée par un conseil qualifié pour votre situation.",
      ],
    },
    {
      heading: "8. Vos droits",
      paragraphs: [
        "Conformément à la loi n° 18-07, vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité de vos données.",
        "Pour exercer ces droits sur les données de votre compte, contactez l'exploitant du service. Pour les données du carnet, adressez-vous directement au magasin concerné, qui en est responsable.",
        "Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l'Autorité nationale de protection des données personnelles (ANPDP).",
      ],
    },
    {
      heading: "9. Sécurité",
      bullets: [
        "Chiffrement en transit (TLS) entre votre navigateur et le service.",
        "Isolation par magasin au niveau de la base de données : chaque requête est filtrée selon le propriétaire.",
        "L'écriture du stock et des soldes passe exclusivement par des fonctions serveur : le navigateur ne peut pas fixer un montant ou une quantité finale.",
        "Journal d'audit immuable des mouvements de stock et des transactions du carnet.",
        "Historique non modifiable : une correction est un nouvel enregistrement, jamais une réécriture.",
      ],
    },
    {
      heading: "10. Stockage local dans le navigateur",
      bullets: [
        "Langue choisie et thème clair ou sombre : conservés localement pour éviter un clignotement au chargement.",
        "Session d'authentification : jeton géré par le service d'authentification.",
      ],
      paragraphs: [
        "Aucun cookie publicitaire n'est déposé. Aucun suivi n'est effectué à des fins commerciales.",
      ],
    },
    {
      heading: "11. Modifications",
      paragraphs: [
        "Cette politique peut être mise à jour. La date en tête de page indique la dernière version. Un changement substantiel sera signalé dans l'application.",
      ],
    },
  ],
};
