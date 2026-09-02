/**
 * Un lecteur des `insert` de `supabase/etablissements.sql`, pour comparer le socle embarque aux lignes
 * publiees sans rien rejouer en base.
 *
 * Ce n'est pas un analyseur SQL : il ne lit que ce que ce fichier ecrit — une liste de colonnes, un
 * tuple de valeurs par ligne — et refuse bruyamment tout le reste. Le vocabulaire est celui du
 * fichier : chaines a apostrophe doublee, `null`, `true`/`false`, nombres, et le cast `::jsonb`,
 * qui rend la valeur analysee. Les commentaires `-- …` peuvent vivre **entre** deux valeurs, et
 * porter des apostrophes : le lecteur les saute a la lettre, il ne les efface pas d'avance.
 *
 * Il vit dans `tools/` parce qu'il n'a aucun usage applicatif : c'est un instrument de test
 * (src/shared/etablissements/socle.test.ts).
 */

export type ValeurSql = string | number | boolean | null | unknown;

export type LigneSql = Readonly<Record<string, ValeurSql>>;

const DEBUT_INSERT = /insert\s+into\s+public\.etablissements\s*\(/g;

class Lecteur {
    private position: number;

    constructor(private readonly texte: string, depuis: number) {
        this.position = depuis;
    }

    /** Saute les blancs et les commentaires de ligne. */
    sauterLeVide(): void {
        for (;;) {
            const reste = this.texte.slice(this.position);
            const blancs = /^\s+/.exec(reste);
            if (blancs !== null) {
                this.position += blancs[0].length;
                continue;
            }
            if (reste.startsWith('--')) {
                const fin = this.texte.indexOf('\n', this.position);
                this.position = fin === -1 ? this.texte.length : fin + 1;
                continue;
            }
            return;
        }
    }

    attendre(caractere: string): void {
        this.sauterLeVide();
        if (this.texte[this.position] !== caractere) {
            throw new Error(`attendu « ${caractere} » a la position ${this.position}, trouve « ${this.texte.slice(this.position, this.position + 20)} »`);
        }
        this.position += 1;
    }

    regarder(): string {
        this.sauterLeVide();
        return this.texte[this.position] ?? '';
    }

    /** Une chaine SQL, apostrophe d'ouverture comprise, avec ses `''`. */
    lireChaine(): string {
        this.attendre("'");
        let valeur = '';
        for (;;) {
            const suivant = this.texte.indexOf("'", this.position);
            if (suivant === -1) throw new Error(`chaine non fermee a la position ${this.position}`);
            valeur += this.texte.slice(this.position, suivant);
            this.position = suivant + 1;
            if (this.texte[this.position] === "'") {
                valeur += "'";
                this.position += 1;
                continue;
            }
            return valeur;
        }
    }

    lireValeur(): ValeurSql {
        const premier = this.regarder();
        if (premier === "'") {
            const chaine = this.lireChaine();
            const cast = /^::(\w+)/.exec(this.texte.slice(this.position));
            if (cast === null) return chaine;
            this.position += cast[0].length;
            if (cast[1] !== 'jsonb') throw new Error(`cast inconnu « ::${cast[1]} » a la position ${this.position}`);
            return JSON.parse(chaine) as unknown;
        }
        const mot = /^(null|true|false|-?\d+(?:\.\d+)?)(?![\w.])/.exec(this.texte.slice(this.position));
        if (mot === null) {
            throw new Error(`valeur illisible a la position ${this.position} : « ${this.texte.slice(this.position, this.position + 20)} »`);
        }
        this.position += mot[0].length;
        if (mot[1] === 'null') return null;
        if (mot[1] === 'true') return true;
        if (mot[1] === 'false') return false;
        return Number(mot[1]);
    }

    /** Une liste `( … )` d'elements lus par `element`, virgule apres virgule, jusqu'a la fermante. */
    lireTuple<T>(element: () => T): T[] {
        this.attendre('(');
        const elements: T[] = [];
        for (;;) {
            elements.push(element());
            const suite = this.regarder();
            if (suite === ',') {
                this.position += 1;
                continue;
            }
            this.attendre(')');
            return elements;
        }
    }

    lireIdentifiant(): string {
        this.sauterLeVide();
        const mot = /^\w+/.exec(this.texte.slice(this.position));
        if (mot === null) throw new Error(`identifiant attendu a la position ${this.position}`);
        this.position += mot[0].length;
        return mot[0];
    }

    lireMotCle(mot: string): void {
        this.sauterLeVide();
        if (!this.texte.startsWith(mot, this.position)) {
            throw new Error(`« ${mot} » attendu a la position ${this.position}`);
        }
        this.position += mot.length;
    }
}

/** Chaque `insert into public.etablissements (colonnes) values (…)` du fichier, colonnes zippees aux valeurs. */
export function lireInsertionsEtablissements(sql: string): readonly LigneSql[] {
    const lignes: LigneSql[] = [];
    for (const debut of sql.matchAll(DEBUT_INSERT)) {
        // Le lecteur reprend juste avant la parenthese ouvrante : c'est elle qui ouvre le tuple.
        const lecteur = new Lecteur(sql, debut.index + debut[0].length - 1);
        const colonnes = lecteur.lireTuple(() => lecteur.lireIdentifiant());
        lecteur.lireMotCle('values');
        const valeurs = lecteur.lireTuple(() => lecteur.lireValeur());
        if (colonnes.length !== valeurs.length) {
            throw new Error(`${colonnes.length} colonnes pour ${valeurs.length} valeurs dans l'insert a la position ${debut.index}`);
        }
        lignes.push(Object.fromEntries(colonnes.map((colonne, i) => [colonne, valeurs[i]])));
    }
    return lignes;
}
