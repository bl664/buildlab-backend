// export async function POST(request) {
//     const { owner, repoName, collaboratorUsername, token } = await request.json();
  
//     const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/collaborators/${collaboratorUsername}`, {
//       method: 'PUT',
//       headers: {
//         Authorization: `token ${token}`,
//         Accept: 'application/vnd.github.v3+json',
//       },
//       body: JSON.stringify({ permission: 'push' }),
//     });
  
//     if (response.status === 201 || response.status === 204) {
//       return new Response(JSON.stringify({ message: 'Collaborator added successfully.' }), {
//         headers: { 'Content-Type': 'application/json' },
//       });
//     } else {
//       const error = await response.json();
//       return new Response(JSON.stringify({ error }), {
//         status: response.status,
//         headers: { 'Content-Type': 'application/json' },
//       });
//     }
//   }
  

const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { owner, repoName, collaboratorUsername, token } = req.body;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/collaborators/${collaboratorUsername}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ permission: 'push' }),
      }
    );
console.log("response is ", response)
    if (response.status === 201 || response.status === 204) {
      return res.status(200).json({ message: 'Collaborator added successfully.' });
    } else {
      const error = await response.json();
      return res.status(response.status).json({ error });
    }
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
