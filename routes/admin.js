var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var mongoose = require('mongoose');
const { response, json } = require('express');

/* GET users listing. */
router.get('/', function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    console.log(products)
    res.render('admin/view-products', { admin: true, products });
  })
});
router.get('/add-product', function (req, res) {
  res.render('admin/add-products')
})
router.post('/add-product', (req, res) => {
  const product = {
    _id: new mongoose.Types.ObjectId(),
    Name: req.body.Name,
    Price: JSON.parse(req.body.Price),
    Category: req.body.Category,
    Description: req.body.Description
  }
  console.log(product)
  productHelpers.addProduct(product, (id)=>{
    let image = req.files.image
    console.log(id)
    image.mv('./public/product-image/' + id + '.jpg', (err) => {
      if (!err) {
        res.render("admin/add-products")
      } else {
        console.log(err)
      }

    })
  })
})
router.get('/delete-product/', (req, res) => {
  let proId = req.query.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then(() => {
    res.redirect('/admin')
  })

})
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  res.render('admin/edit-product', { product })
})
router.post('/edit-product/:id', (req, res) => {
  console.log(req.params.id)
  let id = req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.Image) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})
module.exports = router;