const { User } = require('../models/user')
// const { User } = require('../models/seller')
const config = require('config')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const bcrypt = require('bcrypt')
const _ = require('lodash')
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {

    const { error } = validate(req.body)
    if (error) return res.status(400).send(error.details[0].message)

    let user = await User.findOne({ email: req.body.email })

    if (!user) return res.status(400).send("Invalid email or password")

    const validPassword = await bcrypt.compare(req.body.password, user.password)
    if (!validPassword) return res.status(400).send("Invalid email or password")

    const token = user.generateAuthToken();

    res.header('x-auth-token', token).send(token)
    // send(_.pick(user, ['_id', 'name', 'email']))

})

function validate(body) {
    const schema = Joi.object({
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(8).max(255).required()
    })
    return schema.validate(body)
}

module.exports = router;