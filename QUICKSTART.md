# 🚀 Guide de Démarrage Rapide

## Installation en 5 Minutes

### 1. Configuration de l'Environnement

```bash
cd digital-twin-profile
cp .env.example .env.local
```

Éditez `.env.local` et remplissez :
```env
DATABASE_URL="postgresql://user:password@host:5432/db"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
OPENAI_API_KEY="sk-..."
```

### 2. Initialisation Automatique

```bash
npm run init
```

Cette commande va :
- ✅ Générer le client Prisma
- ✅ Créer les tables dans la base de données
- ⚠️ Vous demander d'exécuter la migration pgvector manuellement

### 3. Migration pgvector (Supabase SQL Editor)

Copiez et exécutez le contenu de :
```
prisma/migrations/001_setup_pgvector.sql
```

### 4. Lancer l'Application

```bash
npm run dev
```

Ouvrez [http://localhost:3000/profile/new](http://localhost:3000/profile/new)

### 5. Créer Votre Premier Profil

1. Entrez un nom et un mot de passe maître (12+ caractères)
2. **IMPORTANT** : Sauvegardez votre phrase de récupération BIP39 !
3. Confirmez et accédez à votre profil

---

## 🔐 Sécurité Zero-Knowledge

### Ce qui est chiffré
- ✅ Contenu des mémoires
- ✅ Métadonnées des profils
- ✅ Phrase de récupération BIP39
- ✅ Embeddings vectoriels

### Ce qui N'EST PAS chiffré
- ❌ Nom du profil (pour affichage)
- ❌ Timestamps
- ❌ ID du profil

### Garanties
- 🔒 Le serveur ne peut JAMAIS déchiffrer vos données
- 🔑 Seul votre mot de passe maître dérive la clé
- 💾 Aucune clé stockée sur le serveur
- 🔄 Phrase BIP39 pour récupération

---

## 📝 Commandes Utiles

```bash
# Développement
npm run dev              # Lancer le serveur de dev

# Base de données
npm run db:generate      # Générer le client Prisma
npm run db:push          # Push le schéma vers la DB
npm run db:studio        # Ouvrir Prisma Studio

# Production
npm run build            # Build pour production
npm run start            # Démarrer en production
```

---

## ⚠️ AVERTISSEMENTS CRITIQUES

### Perte de Données Irréversible

Si vous perdez **À LA FOIS** :
- ❌ Votre mot de passe maître
- ❌ Votre phrase de récupération BIP39

→ **VOS DONNÉES SONT PERDUES DÉFINITIVEMENT**

### Sauvegarde de la Phrase BIP39

✅ **À FAIRE** :
- Écrire sur papier et stocker en lieu sûr
- Utiliser un gestionnaire de mots de passe chiffré
- Faire plusieurs copies dans des endroits différents

❌ **À NE PAS FAIRE** :
- Stocker en clair sur votre ordinateur
- Envoyer par email ou message
- Partager avec qui que ce soit
- Prendre une photo non chiffrée

---

## 🆘 Dépannage

### Erreur : "Module not found @prisma/client"
```bash
npm run db:generate
```

### Erreur : "Extension vector does not exist"
Exécutez dans Supabase SQL Editor :
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Erreur : "Function match_memories does not exist"
Exécutez la migration complète :
```sql
-- Contenu de prisma/migrations/001_setup_pgvector.sql
```

### L'application ne démarre pas
Vérifiez que toutes les variables d'environnement sont définies dans `.env.local`

---

## 📚 Documentation Complète

- **README.md** : Documentation complète du projet
- **walkthrough.md** : Guide détaillé de l'implémentation
- **implementation_plan.md** : Plan d'architecture original

---

## 🎯 Prochaines Fonctionnalités Suggérées

1. **Page de déverrouillage** (`/profile/unlock`)
2. **Dashboard du profil** avec liste des mémoires
3. **Ajout de mémoires** avec génération d'embeddings
4. **Recherche sémantique** dans les mémoires
5. **Export/Import de profil** chiffré
6. **Récupération via phrase BIP39**

---

**Bon développement ! 🚀**
