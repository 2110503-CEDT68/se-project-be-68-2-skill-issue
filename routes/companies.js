const express = require('express');
const {protect, authorize} = require('../middleware/auth');
const {getCompanies, getCompany, createCompany, updateCompany, deleteCompany} = require('../controllers/companies');
const bookingRouter = require('./bookings');
const reviewRouter = require('./reviews');
const router = express.Router();

router.use('/:id/bookings/', bookingRouter);
router.use('/:id/reviews/', reviewRouter);
router.route('/')
    .get(getCompanies)
    .post(protect, authorize('admin'), createCompany);
router.route('/:id')
    .get(protect, getCompany)
    .put(protect, authorize('admin'), updateCompany)
    .delete(protect, authorize('admin'), deleteCompany);
module.exports = router
/**
* @swagger
* components:
*   schemas:
*     Company:
*       type: object
*       required:
*         - name                                                                                                                                                                                                                                                                                                                                                                      
*         - address
*         - website
*         - description
*         - telephone_number
*       properties:
*         id:
*           type: string
*           format: uuid
*           description: The auto-generated id of the company
*         name:
*           type: string
*           description: Company name
*         address:
*           type: string
*           description: Company address
*         website:
*           type: string
*           description: Company website URL
*         description:
*           type: string
*           description: Brief detail about the company
*         telephone_number:
*           type: string
*           description: Contact telephone number
*       example:
*         id: 609bda561452242d88d36e37
*         name: Tech Corp
*         address: 123 Innovation Drive, Bangkok
*         website: www.techcorp.com
*         description: Leading software development company.
*         telephone_number: 02-123-4567
*/

/**
* @swagger
* /companies/{id}:
*   get:
*     summary: Get the company by id
*     tags: [Companies]
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           required: true
*           description: The company id
*     responses:
*       200:
*         description: The company description by id
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Company'
*       404:
*         description: The company was not found
*/
/**
* @swagger
* /companies:
*   get:
*     summary: Returns the list of all the companies
*     tags: [Companies]
*     responses:
*       200:
*         description: List of companies
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/Company'
*/