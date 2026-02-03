/**
 * API Route: Create Profile
 * Handles server-side profile creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { profileManager } from '@/lib/profile/profile-manager';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, passwordHash, saltBase64, encryptedMetadata, encryptedPhrase, vectorNamespace } = body;

        // Validation
        if (!name || typeof name !== 'string' || name.length < 2) {
            return NextResponse.json(
                { error: 'Le nom doit contenir au moins 2 caractères' },
                { status: 400 }
            );
        }

        // Validate encrypted data fields
        if (!passwordHash || typeof passwordHash !== 'string') {
            return NextResponse.json(
                { error: 'Hash de mot de passe manquant ou invalide' },
                { status: 400 }
            );
        }

        if (!saltBase64 || typeof saltBase64 !== 'string') {
            return NextResponse.json(
                { error: 'Salt manquant ou invalide' },
                { status: 400 }
            );
        }

        if (!encryptedMetadata || typeof encryptedMetadata !== 'string') {
            return NextResponse.json(
                { error: 'Métadonnées chiffrées manquantes ou invalides' },
                { status: 400 }
            );
        }

        if (!encryptedPhrase || typeof encryptedPhrase !== 'string') {
            return NextResponse.json(
                { error: 'Phrase de récupération chiffrée manquante ou invalide' },
                { status: 400 }
            );
        }

        if (!vectorNamespace || typeof vectorNamespace !== 'string') {
            return NextResponse.json(
                { error: 'Namespace vectoriel manquant ou invalide' },
                { status: 400 }
            );
        }

        // Create profile with pre-encrypted data
        const result = await profileManager.createProfile({
            name,
            passwordHash,
            saltBase64,
            encryptedMetadata,
            encryptedPhrase,
            vectorNamespace,
        });

        return NextResponse.json({
            success: true,
            profileId: result.profileId,
        });
    } catch (error: any) {
        console.error('Profile creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur lors de la création du profil' },
            { status: 500 }
        );
    }
}
