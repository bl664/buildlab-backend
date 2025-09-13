const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("fetching user details")
    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = newReq.userId;

    try {
        const query = `
            SELECT 
                mu.user_id as user_id,
                mu.name,
                mu.email,
                mu.created_at as user_created_at,
                p.id as profile_id,
                p.headline,
                p.bio,
                p.specialization,
                p.location,
                p.linkedin_url,
                p.github_url,
                p.website_url,
                p.experience,
                p.education,
                p.created_at as profile_created_at,
                p.updated_at as profile_updated_at
            FROM messaging_users mu
            LEFT JOIN user_profiles p ON mu.user_id = p.user_id
            WHERE mu.user_id = $1;`;

        const result = await queryDatabase(query, [user_id]);
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = result[0];
        console.log("user detail is ", userData)
        res.status(200).json({
            user: {
                id: userData.user_id,
                name: userData.name,
                email: userData.email,
                created_at: userData.user_created_at
            },
            profile: userData.profile_id ? {
                id: userData.profile_id,
                headline: userData.headline,
                bio: userData.bio,
                specialization: userData.specialization,
                location: userData.location,
                linkedin_url: userData.linkedin_url,
                github_url: userData.github_url,
                website_url: userData.website_url,
                experience: userData.experience,
                education: userData.education,
                created_at: userData.profile_created_at,
                updated_at: userData.profile_updated_at
            } : null
        });

    } catch (error) {
        console.error('Get profile error:', error);

        res.status(500).json({ 
            error: 'Error fetching profile' 
        });
    }
});

module.exports = router;