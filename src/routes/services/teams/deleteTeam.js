
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
//router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.delete('/', async (req, res) => {
    console.log("yes deleting Team")
    //    
    //   

    //  
    // const mentor_id = req.user.id
    console.log("req.body", req.body)
    const { id } = req.body;
    try {
        console.log("deleting id is ", id)
        const query = `
        DELETE FROM teams WHERE id = $1;
        `;
        const values = [id];

        const result = await queryDatabase(query, values);
        // const teams = result;
console.loggg("deleted result", result)
        return res.json({
            message: 'deleted',
            result: id
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

