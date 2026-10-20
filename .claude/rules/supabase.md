---
paths:
  - "supabase/**"
  - "src/shared/supabase/**"
  - "tools/retours/**"
  - "tools/media/**"
---
# Base de publication Supabase

La base porte ce que l'équipe publie (annonces, catalogue, Blueprints, messages) ; elle ne relaie aucune source tierce et l'application vit sans elle sur son socle embarqué. Procédures d'exploitation mesurées : `supabase/README.md`.

## Schéma et migrations
- Faire évoluer le schéma par migration, jamais par l'interface web, et mettre à jour la vue lisible (`schema.sql`, `fonctions.sql`, `policies.sql`) dans le même commit. Rejouer `etablissements.sql` par `psql` après le `db push`.
- Pas d'`update` de données dans une migration que `schema.sql` recopierait : poser l'ancien défaut puis changer le défaut (un `update` serait attribué à l'utilisateur SQL dans le journal).
- Table de référence (`evenements_connus`) : insérer dans la migration ET dans `schema.sql` en `on conflict do update` ; un test compare.
- Jouer toute migration sur la production en transaction annulée (`set local role authenticated`, `request.jwt.claims`) avant `--dry-run` : les politiques s'éprouvent en cas réels.
- CLI : `npx --yes supabase@<version> … --project-ref <ref>`, jamais `--linked`, jamais en dépendance ; fonctions : `deploy --use-api` (sans Docker). Poste sans IPv6 : `psql` par le session pooler (la connexion directe est IPv6 seule).
- Deux branches (`v6.3`, `main`) qui migrent la même base : si la production porte une migration absente, `db push` refuse ; pousser depuis un dossier portant l'union, ne jamais réparer l'historique.

## Accès et rôles
- RLS sur toutes les tables, même sans donnée sensible ; `anon` n'écrit jamais et on révoque le privilège. Révoquer aussi le `select` d'`anon` sur les tables privées (une RLS sans politique rend `[]`, pas un refus 42501). Restreindre par privilège de colonne ; si deux rôles partagent `authenticated`, passer par une RPC (`contact_du_retour`).
- `revoke select (col)` seul ne retire rien : retirer la lecture de table puis accorder colonne par colonne. Nommer les colonnes lues de `retours` et `jetons_push`, jamais `select *`.
- Gardes en `security definer` + `set search_path = ''` + noms qualifiés, dans le schéma `private`. Aucune fonction ne calcule pour l'écran.
- L'application n'écrit que par RPC `security definer` (`deposer_jeton`, `retirer_jeton`, `compter`), chacune avec son interrupteur. Rédacteur : `peut_publier(etablissements)` en `using` ET `with check` ; supprimer est un geste d'admin, une annonce s'archive. La base garde toujours au moins un admin.
- « Tous les campus » = `null` (règle globale), tenu par un `check` qui refuse aussi `'{}'` : l'app lit `[]` comme « tous » et `'{}' <@ borne` est vrai en SQL.
- Aucun compte console ne lit `jetons_push.jeton`, admin compris : Expo notifie tout jeton connu, qui le lit se fait passer pour notre serveur. L'adresse d'un retour n'a qu'une copie (`contact_du_retour()` pour l'admin), jamais recopiée dans `reponses` ni le journal.
- `maj_le` est tenu par déclencheur (verrou d'écrasement), daté par `clock_timestamp()` (`now()` est le début de transaction). Le journal copie la ligne entière : effacer un retour = `retours` + `journal` + feuille Google. Purges manuelles voulues (journal 1 an, mesures 13 mois).
- La clé publiable est un identifiant (variables EAS `plaintext`) : la frontière, ce sont les politiques.

## Client et lectures
- Client unique dans `src/shared/supabase/`, construit au premier usage (jamais à l'import : pas de base sur le chemin de démarrage ; `createClient` lève sans WebSocket) ; typé par `Database` mais le schéma ne satisfait pas `GenericSchema` : `from` accepte n'importe quelle chaîne, `rpc` refuse tout, d'où `appeler` (`rpc.ts`) sur le client nu. Échec → `null` → socle.
- Erreur de lecture : transport, clés absentes, 401, 42501 donnent `unavailable` ; `PGRST200/202/204/205`, `42P01` et `42703` donnent `rejected` sans bouton ; jamais `config`.
- Médias : `cache-control: max-age=31536000` sur chaque objet, y compris à la main ; mesurer les en-têtes en `GET`, jamais en `HEAD`. Les 3 adresses embarquées dans le binaire (CRÉMI dans `assets/locations.json`, 2 logos dans `socle.ts`) ne se remplacent jamais en place : nouveau nom et surcouche en base. Remplacer un visuel publié = changer son adresse (`?v=N` seulement si les octets changent).
- La base ne stocke que des adresses d'origine ; le rendu (`/render/image/…&resize=contain`, paliers 320 à 2000) se compose à l'affichage, `contain` obligatoire. Purge CDN ≈ 1 minute : ne pas conclure d'un premier `curl`.
- `notifier` : réserver le message par `update` conditionnel avant l'envoi, rendre la réservation si rien n'est parti, lire les jetons par pages ; `regles.test.ts` vert avant redéploiement (copie Deno du ciblage). Canal Android `messages-de-service` identique des deux côtés, jamais modifié (importance figée à la création).
- Retours : clé = empreinte (jamais retoucher la feuille : la ligne reviendrait « nouveau »), fuseau Europe/Paris, jamais d'impression de réponse en CI (journal public). Conserver `ukit-data` et l'ancien hébergement des visuels.
