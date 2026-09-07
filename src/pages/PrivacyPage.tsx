import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">
          Politique de confidentialité
        </h1>
        <p className="mb-8 text-sm text-neutral-500">
          Dernière mise à jour : 8 septembre 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              1. Responsable du traitement
            </h2>
            <p>
              Managiha est un logiciel de gestion de stock et de carnet de crédit pour
              épiceries, édité à titre open-source. Les données sont stockées sur les
              serveurs de Supabase Inc. (AWS, région eu-west-1). Le responsable du
              traitement est le propriétaire du compte Managiha (l'épicier).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              2. Données collectées
            </h2>
            <p className="mb-2">Managiha collecte et traite les données suivantes :</p>
            <ul className="list-inside list-disc space-y-1 ps-4">
              <li>
                <strong>Données de compte</strong> : adresse email, nom complet (fournis
                lors de l'inscription).
              </li>
              <li>
                <strong>Données du magasin</strong> : nom, adresse, téléphone du commerce.
              </li>
              <li>
                <strong>Données produits</strong> : noms, prix, quantités, dates
                d'expiration, catégories, fournisseurs.
              </li>
              <li>
                <strong>Données carnet</strong> : noms et téléphones des clients
                créditaires, montants dus et historique des transactions.
              </li>
              <li>
                <strong>Données de stock</strong> : historique des mouvements (réception,
                vente, ajustement, etc.).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              3. Finalité du traitement
            </h2>
            <p>
              Les données sont traitées exclusivement pour les finalités suivantes :
            </p>
            <ul className="list-inside list-disc space-y-1 ps-4">
              <li>Fourniture du service de gestion de stock et de carnet de crédit.</li>
              <li>Authentification et sécurisation du compte.</li>
              <li>Affichage des statistiques et rapports au propriétaire du magasin.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              4. Base légale — Loi 18-07 modifiée par la loi 25-11
            </h2>
            <p className="mb-2">
              Le traitement des données personnelles par Managiha repose sur :
            </p>
            <ul className="list-inside list-disc space-y-1 ps-4">
              <li>
                <strong>Consentement de l'utilisateur</strong> (article 8 de la loi 18-07
                relative à la protection des personnes physiques dans le traitement des
                données à caractère personnel, telle que modifiée par la loi 25-11) :
                l'utilisateur consent explicitement au traitement de ses données lors de
                l'inscription et de l'utilisation du service.
              </li>
              <li>
                <strong>Nécessité contractuelle</strong> (article 9) : le traitement est
                nécessaire à l'exécution du service demandé par l'utilisateur (gestion de
                son magasin).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              5. Durée de conservation
            </h2>
            <p>
              Les données sont conservées tant que le compte de l'utilisateur est actif.
              En cas de suppression de compte, les données sont supprimées sous 30 jours,
              conformément à l'article 12 de la loi 18-07. Les données peuvent être
              conservées plus longtemps en cas d'obligation légale.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              6. Droits des utilisateurs
            </h2>
            <p className="mb-2">
              Conformément aux articles 15 à 22 de la loi 18-07 modifiée par la loi 25-11,
              chaque utilisateur dispose des droits suivants :
            </p>
            <ul className="list-inside list-disc space-y-1 ps-4">
              <li>
                <strong>Droit d'accès</strong> (article 15) : obtenir une copie de toutes
                les données personnelles traitées.
              </li>
              <li>
                <strong>Droit de rectification</strong> (article 16) : corriger les
                données inexactes.
              </li>
              <li>
                <strong>Droit à l'effacement</strong> (article 17) : demander la
                suppression des données personnelles.
              </li>
              <li>
                <strong>Droit à la portabilité</strong> (article 18) : recevoir les
                données dans un format structuré et couramment utilisé.
              </li>
              <li>
                <strong>Droit d'opposition</strong> (article 19) : s'opposer au
                traitement pour des motifs légitimes.
              </li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à l'adresse indiquée dans les
              paramètres de votre compte.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              7. Sécurité des données
            </h2>
            <p>
              Managiha met en œuvre les mesures techniques et organisationnelles suivantes
              pour protéger les données :
            </p>
            <ul className="list-inside list-disc space-y-1 ps-4">
              <li>Chiffrement TLS pour toutes les communications.</li>
              <li>
                Authentification par jetons (PKCE) avec expiration automatique.
              </li>
              <li>
                Politiques de sécurité au niveau des lignes (Row Level Security) garantissant
                que chaque utilisateur n'accède qu'à ses propres données.
              </li>
              <li>Sauvegardes automatiques des données par Supabase.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              8. Transferts de données
            </h2>
            <p>
              Les données sont hébergées sur les serveurs d'AWS (eu-west-1, Irlande). En
              utilisant Managiha, l'utilisateur accepte que ses données puissent être
              transférées vers ces serveurs. Aucun transfert vers des pays tiers n'est
              effectué.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              9. Cookies et traceurs
            </h2>
            <p>
              Managiha n'utilise aucun cookie de tracking ni traceur publicitaire. Seuls
              les cookies strictement nécessaires au fonctionnement du service
              (session d'authentification) sont utilisés.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              10. Modifications de la politique
            </h2>
            <p>
              Cette politique peut être mise à jour. En cas de modification substantielle,
              les utilisateurs seront notifiés par email ou via une notification dans
              l'application.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              11. Contact
            </h2>
            <p>
              Pour toute question relative à cette politique de confidentialité ou pour
              exercer vos droits, vous pouvez nous contacter via les paramètres de votre
              compte Managiha ou par email à l'adresse fournie dans l'application.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          <p>
            Managiha — Conforme à la loi algérienne 18-07 modifiée par la loi 25-11
            relative à la protection des personnes physiques dans le traitement des
            données à caractère personnel.
          </p>
        </div>
      </div>
    </div>
  );
}