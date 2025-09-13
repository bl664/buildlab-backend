// const express = require('express');
// const router = express.Router();

// router.get('/', async (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1]; // Expecting: Bearer <token>

//   if (!token) {
//     return res.status(401).json({ error: 'Missing GitHub access token' });
//   }

//   try {
//     const response = await fetch('https://api.github.com/user', {
//       headers: {
//         Authorization: `token ${token}`,
//         Accept: 'application/vnd.github.v3+json',
//       },
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       return res.status(response.status).json({ error });
//     }

//     const userData = await response.json();
//     res.status(200).json(userData);
//   } catch (error) {
//     console.error('Error fetching GitHub user info:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// module.exports = router;

async function getGitHubUser(token) {
    if (!token) {
      throw new Error('Missing GitHub access token');
    }
  
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  
    const data = await response.json();
  
    if (!response.ok) {
      const message = data?.message || 'Failed to fetch GitHub user info';
      throw new Error(message);
    }
  
    return data; // GitHub user object
  }
  
  module.exports = getGitHubUser;
  
