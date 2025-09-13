const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.put('/', async (req, res) => {
    console.log("Profile update request received");

    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = newReq.userId;

    try {
        const {
            full_name,
            headline,
            bio,
            profile_picture,
            specialization,
            location,
            linkedin_url,
            github_url,
            website_url,
            experience,
            education,
        } = req.body.formData;

        console.log("req.body", req.body.formData);

        const nameToUpdate = full_name ;

        // Start a transaction for atomic updates
        await queryDatabase('BEGIN');

        let updatedUser = null;
        let updatedProfile = null;

        // Update users table if name is provided
        if (nameToUpdate) {
            const userQuery = `UPDATE messaging_users SET 
                name = $1,
                updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                RETURNING *;`;

            const userValues = [nameToUpdate, user_id];
            const userResult = await queryDatabase(userQuery, userValues);
            updatedUser = userResult[0];
            console.log("User updated:", updatedUser);
        }

        // Check if profile exists
        const checkProfileQuery = `SELECT id FROM user_profiles WHERE user_id = $1`;
        const existingProfile = await queryDatabase(checkProfileQuery, [user_id]);

        if (existingProfile.length > 0) {
            // Update existing profile
            const updateProfileQuery = `
                UPDATE user_profiles SET 
                    headline = COALESCE($1, headline),
                    bio = COALESCE($2, bio),
                    specialization = COALESCE($3, specialization),
                    location = COALESCE($4, location),
                    linkedin_url = COALESCE($5, linkedin_url),
                    github_url = COALESCE($6, github_url),
                    website_url = COALESCE($7, website_url),
                    experience = COALESCE($8, experience),
                    education = COALESCE($9, education),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $10
                RETURNING *;`;

            const profileValues = [
                headline || null,
                bio || null,
                specialization || null,
                location || null,
                linkedin_url || null,
                github_url || null,
                website_url || null,
                experience || null,
                education || null,
                user_id
            ];

            const profileResult = await queryDatabase(updateProfileQuery, profileValues);
            updatedProfile = profileResult[0];
            console.log("Profile updated:", updatedProfile);
        } else {
            // Create new profile
            const createProfileQuery = `
                INSERT INTO user_profiles (
                    user_id, headline, bio, 
                    specialization, location, linkedin_url, github_url, 
                    website_url, experience, education, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING *;`;

            const profileValues = [
                user_id,
                headline || null,
                bio || null,
                specialization || null,
                location || null,
                linkedin_url || null,
                github_url || null,
                website_url || null,
                experience || null,
                education || null
            ];

            const profileResult = await queryDatabase(createProfileQuery, profileValues);
            updatedProfile = profileResult[0];
            console.log("Profile created:", updatedProfile);
        }

        // Commit the transaction
        await queryDatabase('COMMIT');

        // Return combined response
        res.status(200).json({
            message: 'Profile updated successfully',
            updatedUser: updatedUser,
            updatedProfile: updatedProfile,
            // Keep backwards compatibility
            user: updatedUser
        });

    } catch (error) {
        // Rollback transaction on error
        try {
            await queryDatabase('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }

        console.error('Profile update error:', error);
        logger.error('Profile update failed', { 
            userId: user_id, 
            error: error.message,
            stack: error.stack 
        });

        res.status(500).json({ 
            error: 'Error updating profile',
            message: error.message 
        });
    }
});

module.exports = router;