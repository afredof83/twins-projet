# Digital Twin Profile - Zero-Knowledge Architecture

Un système de gestion de profils de jumeaux numériques avec chiffrement Zero-Knowledge et mémoire vectorielle isolée.

## 🔐 Caractéristiques de Sécurité

- **Chiffrement Zero-Knowledge** : AES-256-GCM avec dérivation de clés PBKDF2 (100k itérations)
- **Isolation stricte** : Chaque profil dispose de son propre espace vectoriel et clés de chiffrement
- **Phrase de récupération BIP39** : 12 mots pour la récupération du profil
- **Aucune clé sur le serveur** : Toutes les clés restent côté client
- **Mémoire vectorielle sécurisée** : Supabase pgvector avec recherche sémantique chiffrée

## 📦 Architecture

```
digital-twin-profile/
├── lib/
│   ├── crypto/
│   │   ├── zk-encryption.ts      # Chiffrement AES-256-GCM
│   │   └── key-manager.ts        # Gestion de session sécurisée
│   ├── vector/
│   │   ├── vector-store.ts       # Interface abstraite
│   │   ├── supabase-pgvector.ts  # Implémentation Supabase
│   │   └── embedding-service.ts  # Génération d'embeddings
│   ├── profile/
│   │   ├── profile-manager.ts    # Gestion des profils
│   │   └── profile-schema.ts     # Types TypeScript
│   └── db/
│       └── supabase.ts           # Client Supabase
├── app/
│   ├── profile/
│   │   └── new/
│   │       └── page.tsx          # Création de profil
│   └── api/
│       └── profile/
│           └── create/
│               └── route.ts      # API de création
└── prisma/
    ├── schema.prisma             # Schéma de base de données
    └── migrations/
        └── 001_setup_pgvector.sql # Migration pgvector
```

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Copiez `.env.example` vers `.env.local` et remplissez les valeurs :

```bash
cp .env.example .env.local
```

Variables requises :
- `DATABASE_URL` : URL PostgreSQL
- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de rôle de service Supabase
- `OPENAI_API_KEY` : Clé API OpenAI (pour les embeddings)

### 3. Configurer la base de données

#### a. Activer pgvector dans Supabase

Dans le SQL Editor de Supabase, exécutez :

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### b. Exécuter les migrations Prisma

```bash
npx prisma generate
npx prisma db push
```

#### c. Exécuter la migration pgvector

Dans le SQL Editor de Supabase, exécutez le contenu de :
`prisma/migrations/001_setup_pgvector.sql`

### 4. Lancer l'application

```bash
npm run dev
```

Accédez à [http://localhost:3000/profile/new](http://localhost:3000/profile/new) pour créer votre premier profil.

## 🔑 Utilisation

### Créer un nouveau profil

1. Naviguez vers `/profile/new`
2. Entrez un nom et un mot de passe maître (min. 12 caractères)
3. **IMPORTANT** : Sauvegardez votre phrase de récupération BIP39 (12 mots)
4. Confirmez et accédez à votre profil

### Sécurité Zero-Knowledge

- **Chiffrement côté client** : Toutes les données sont chiffrées avant d'être envoyées au serveur
- **Pas de clé sur le serveur** : Le serveur ne peut jamais déchiffrer vos données
- **Phrase de récupération** : Seule façon de récupérer votre profil si vous oubliez votre mot de passe
- **Perte irréversible** : Si vous perdez votre phrase de récupération ET votre mot de passe, vos données sont perdues définitivement

## 🧠 Mémoire Vectorielle

Le système utilise Supabase pgvector pour stocker et rechercher des embeddings :

- **Dimension** : 1536 (OpenAI text-embedding-3-small)
- **Recherche sémantique** : Cosine similarity avec seuil configurable
- **Isolation stricte** : Chaque profil a son propre namespace vectoriel

## 📚 API

### POST `/api/profile/create`

Crée un nouveau profil.

**Body** :
```json
{
  "name": "Mon Jumeau",
  "masterPassword": "mot-de-passe-très-sécurisé"
}
```

**Response** :
```json
{
  "success": true,
  "profileId": "clx...",
  "recoveryPhrase": "word1 word2 word3 ... word12",
  "salt": "base64-encoded-salt"
}
```

## 🛡️ Sécurité

### Bonnes pratiques

1. **Mot de passe maître** : Utilisez un mot de passe fort (min. 12 caractères, idéalement 20+)
2. **Phrase de récupération** : Stockez-la dans un endroit sûr (coffre-fort, gestionnaire de mots de passe)
3. **Ne partagez jamais** : Ni votre mot de passe ni votre phrase de récupération
4. **Auto-lock** : Le système verrouille automatiquement après 30 minutes d'inactivité

### Architecture de chiffrement

- **Algorithme** : AES-256-GCM (authentification intégrée)
- **Dérivation de clé** : PBKDF2-SHA256 avec 100 000 itérations
- **Salt** : 32 bytes aléatoires cryptographiquement sécurisés
- **IV** : 12 bytes aléatoires par opération de chiffrement

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue avant de soumettre une PR.

---

**⚠️ AVERTISSEMENT** : Ce système utilise un chiffrement Zero-Knowledge. La perte de votre mot de passe maître ET de votre phrase de récupération entraînera une perte IRRÉVERSIBLE de toutes vos données. Sauvegardez votre phrase de récupération en lieu sûr !
