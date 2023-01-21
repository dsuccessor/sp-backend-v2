const studentControl = require('../controls/studentControl')
const express = require('express')
const router = express.Router()

router.post('/register', studentControl.createStudent)
router.get('/fetchAll', studentControl.fetchAllStudent)
router.get('/fetch/:email', studentControl.fetchStudent)
router.put('/update/:email', studentControl.updateStudent)
router.delete('/delete/:email', studentControl.delStudent)


module.exports = router