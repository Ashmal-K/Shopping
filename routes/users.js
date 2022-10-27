var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const verifyLogin = (req, res, next) => {
  if (req.session.userloggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async (req, res) => {
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { products, user, cartCount });
  })
});
router.get('/logout', (req, res) => {
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { products });
  })
})

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.userloggedErr })
    req.session.userloggedErr = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.user = response
    req.session.userloggedIn = true
    res.redirect('/')
  })
})
router.post('/login', (req, res) => {
  let login = {
    Email: req.body.Email,
    Password: req.body.Password
  }
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user=response = response.user
      req.session.userloggedIn = true
      res.redirect('/')
    } else {
      req.session.userloggedErr ="invalid username or password"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userloggedIn=false
  res.redirect('/')
})
router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let total=0
  if(products.length>0){

    total= await userHelpers.getTotalAmount(req.session.user._id) 
  }
  res.render('user/cart', { products, user: req.session.user._id, total })
})
router.get('/add-to-cart/:id',async(req, res) => {
  await userHelpers.addToCart(req.params.id,req.session.user._id).then(() => {
    res.json({ status: true })
  })
})
router.post('/change-product-quantity', (req,res)=>{
  console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total= await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.post('/remove-product', (req,res)=>{
  console.log(req.body)
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json(response)
  })
})
router.get('/place-order',verifyLogin, async(req,res)=>{
  let total = 0
  total=await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/place-order',{total, user: req.session.user})
})
router.post('/place-order', async(req,res)=>{
  let products =await userHelpers.getCartProductsList(req.body.userId)
  let totalPrice =await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      res.json({codsuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
  })
})
router.get('/order-success', (req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
router.get('/Order', async(req,res)=>{
  let Orders=await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user, Orders})
})
router.get('/view-order-products/:id', verifyLogin, async(req,res)=>{
  let products= await userHelpers.getOrderProducts(req.params.id)
  console.log(products)
  res.render('user/view-order-products',{user:req.session.user,products})
})
router.post('/verify-payment', (req,res)=>{
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false,errMsg:'payment failed'})
  })
})
module.exports = router;