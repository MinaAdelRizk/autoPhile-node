const { Tyre, validate } = require('../models/tyre')
const { Category } = require('../models/category');
const { Seller } = require('../models/seller');
const express = require('express');
const router = express.Router();

const populateSellerListings = require('../middleware/population');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Manufacturer } = require('../models/manufacturer');

const { upload } = require('../middleware/fileUpload');
const { deleteProductImage } = require('./files')
router.get('/', async (req, res) => {
    const tyres = await Tyre.find().sort('name');
    if (!tyres) res.status(404).send('No Tyres Found!')
    res.send(tyres);
})

router.get('/:id', async (req, res) => {
    const tyre = await Tyre.findById(req.params.id)
    if (!tyre) return res.status(404).send("No Tyre found with the given ID")
    res.send(tyre)
})

router.post('/', [auth, upload.single("productImage")], async (req, res) => {
    try {

        const { error } = validate(req.body)
        if (error) return res.status(400).send(error.details[0].message)

        const cat = await Category.findById(req.body.category)
        if (!cat) return res.status(400).send("Unable to find a Category with the given ID")

        const { manufacturers, types } = cat
        const mnf = manufacturers.find(m => m._id.toString() === req.body.mnf)
        const type = types.find(t => t._id.toString() === req.body.type)
        //add sub category
        let seller = await Seller.findById(req.body.seller)
        if (!seller) return res.status(400).send("No Seller found with the given SellerID")
        //here we can query the seller ID through the JWT if isSeller: true; !! strength point

        const tyre = new Tyre({
            title: `${mnf.name} ${req.body.width}/${req.body.height}/R${req.body.rim} ${type.name.split(' ')[0]}`,
            category: {
                name: cat.name,
                _id: cat._id
            },
            type: type,
            width: req.body.width,
            height: req.body.height,
            rim: req.body.rim,
            year: req.body.year,
            mnf: {
                name: mnf.name,
                _id: mnf._id
            },
            price: req.body.price,
            numberInStock: req.body.numberInStock,
            seller: {
                _id: seller._id,
                name: seller.name,
                rating: seller.rating
            },
            homeInstallation: req.body.homeInstallation,
            productImage: req.file.filename
        })

        console.log(tyre)
        const result = await tyre.save()

        populateSellerListings(seller, tyre) //item

        // res.send(tyre)

        if (!result) res.status(500).send("Something went wrong");
        res.send(result)

    } catch (ex) {
        // res.status(500).send(ex.message)
        console.log(ex)
    }

});

router.put('/:id', async (req, res) => {
    try {

        const { error } = validate(req.body)
        if (error) return res.status(400).send(error.details[0].message)

        const category = await Category.findById(req.body.category)
        if (!category) return res.status(400).send("invalid category")

        const manufacturer = await Manufacturer.findById(req.body.manufacturerId)
        if (!manufacturer) return res.status(400).send("No manufacturer found with the given Id")

        const seller = await Seller.findById(req.body.seller)
        if (!seller) return res.status(400).send("No Seller found with the given SellerID")

        const tyre = await Tyre.findByIdAndUpdate(req.params.id, {
            $set: {
                title: function () { return this.manufacturer.name + this.width + this.heigh + this.rim },
                category: { _id: category._id, name: category.name },
                width: req.body.width,
                height: req.body.height,
                rim: req.body.rim,
                year: req.body.year,
                manufacturer: { name: manufacturer.name, _id: manufacturer._id },
                price: req.body.price,
                numberInStock: req.body.numberInStock,
                seller: { _id: seller._id, name: seller.name },
            }
        }, { new: true })

        if (!tyre) return res.status(404).send("unable to match any Tyre with the given ID")

        await tyre.save()

        // seller.listings.push = { "TyreId": tyre._id }
        // await seller.save()

        res.send(tyre)

    } catch (error) {
        res.status(500).send(error.message)
    }
})

router.delete('/:id', [auth, admin], async (req, res) => {

    let seller = await Seller.findById(req.user.sellerId)
    if (!seller) return res.status(400).send("Access Denied, Unauthorized account")

    try {
        const tyre = await Tyre.findByIdAndDelete(req.params.id)
        if (!tyre) return res.status(404).send("No Tyre with the given ID")

        await deleteProductImage(tyre.productImage)

        seller.listings.splice(seller.listings.indexOf({ _id: tyre._id }), 1)

        await seller.save()

        res.send(tyre)
    } catch (error) {
        res.send(error.message)
    }
})


module.exports = router;