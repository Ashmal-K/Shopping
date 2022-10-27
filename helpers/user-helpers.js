var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
const { ObjectId, HostAddress } = require('mongodb')
const { remove } = require('list')
var objectId = require('mongodb').ObjectId
const Razorpay= require('razorpay')
var instance = new Razorpay({
    key_id:'rzp_test_F06BP1laIyNgot',
    key_secret:'K7BJ8TrIwKYdr8WMWp45hGOA'
})
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData)
            resolve(userData.Password)
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            console.log(userData)
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login Success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login faild')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('login failed')
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart =await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExit = userCart.products.findIndex(product => product.item==proId)
                if (proExit!=-1) {
                    db.get().collection(collection.CART_COLLECTION).
                        updateOne({user:objectId(userId),'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity':1 }
                            }
                        ).then((response) => {
                            resolve()
                        })
                } else {

                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push:{ products: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }

        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([

                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'products'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$products',0]}
                    }
                }
            ]).toArray()
            console.log(cartItems)
            resolve(cartItems)

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })

    },
    changeProductQuantity:(details) => {
        count=parseInt(details.count)
        quantity=parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if(count==-1 && quantity==1){
            db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id:objectId(details.cart)},
                    {   
                        $pull:{products:{item: objectId(details.product)}}
                    },
                ).then((response) => {
                    resolve({removeProduct:true})
                })
            }else{
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id:objectId(details.cart),'products.item': objectId(details.product)},
                {
                    $inc: { 'products.$.quantity':count}
                }
                ).then((response) => {

                    resolve({status:true})

                })
            }    
        })
    },
    getTotalAmount:(userId)=>{

        return new Promise(async (resolve, reject) => {

            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField: '_id',
                        as:'products'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$products',0]}
                    }
                },
                {
                    $group:{
                      _id:null,
                      total:{$sum:{$multiply:['$quantity','$products.Price']}}
                  }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },
    getCartProductsList:(userId)=>{
       return new Promise(async(resolve,reject)=>{
        let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        console.log(cart)
        resolve(cart.products)
    })
    },
    placeOrder:(order,products,total)=>{
        return new Promise(async(resolve,reject)=>{
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                paymentMethode:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj)
                db.get().collection(collection.CART_COLLECTION).remove({user:objectId(order.userId)})
                console.log()
                resolve(orderObj._id)
            })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let Orders= db.get().collection(collection.ORDER_COLLECTION).find({userId:ObjectId(userId)}).toArray()
            resolve(Orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField: '_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*10,
                currency:"INR",
                receipt:""+orderId
            }
            instance.orders.create(options, function(err, order){
                if(err){
                    console.log(err)
                }else{
                resolve(order)
                }
            })
        })
    },
    verifyPayment:(details)=>{
        console.log(details)
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'K7BJ8TrIwKYdr8WMWp45hGOA')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        console.log(orderId)
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).
            updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    }

}
