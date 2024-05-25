import User from '../models/user.model.js';
import WinnigBid from '../models/winning.model.js';
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js'
import {
    CloudinaryStorage
} from "multer-storage-cloudinary"
import multer from "multer";
import Product from '../models/product.model.js'
import moment from 'moment';
import CategoryModel from "../models/category.model.js";
import transporter from "../config/transporter.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "Product",
    },
});

export default {


    async verify(req, res) {


        const otp = "" + req.query.otp;

        const user = await User.findOne({
            confirmationCode: otp
        });

        if (!user || user.status === 'Active') {
            return res.render('404', {
                layout: false
            });
        }

        user.status = 'Active';
        user.confirmationCode = null;
        await user.save();

        return res.render('verify', {
            title: 'Verify',
            layout: false
        })

    },

    async postProduct(req, res) {
        // get all categories
        const categories = await CategoryModel.find({}).lean();
        res.render('postProduct', {
            categories
        });
    },


    upload: async (req, res) => {

        const upload = multer({
            storage: storage
        }).array("imageList", 5);


        // upload images to cloudinary
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).send({
                    message: "Error uploading image"
                });
            }

            const images = req.files.map(file => file.path);


            // create a set
            const set = new Set(images);

            // split ',' in each category
            const hashMap = {};

            let categorySaveInProduct = [];

            // check that category is String or Array

            if (typeof req.body.category === 'string') {
                // split category with ,
                const category = req.body.category.split(',');
                hashMap[category[1]] = category[0];
                categorySaveInProduct.push(category[0]);
                categorySaveInProduct.push(category[1]);

            } else {
                for (let i = 0; i < req.body.category.length; i++) {
                    var temp = req.body.category[i].split(',');
                    const category = temp[1];
                    const subCategory = temp[0];

                    if (hashMap[category]) {
                        hashMap[category].push(subCategory);
                    } else {
                        hashMap[category] = [subCategory];
                    }
                }
            }


            if (typeof req.body.category === 'string') {

            } else {
                // loop through hashmap
                for (let key in hashMap) {
                    // loop through sub key
                    for (let i = 0; i < hashMap[key].length; i++) {
                        // push category object to categorySaveInProduct
                        categorySaveInProduct.push(hashMap[key][i]);
                    }
                    categorySaveInProduct.push(key);
                }
            }
            categorySaveInProduct = [...new Set(categorySaveInProduct)];

            // find category which has name is same as the key in hashmap

            const category = await CategoryModel.find({
                name: {
                    $in: Object.keys(hashMap)
                }
            });

            // adding number of subcategory to each category

            if (typeof req.body.category === 'string') {
                for (let i = 0; i < category.length; i++) {
                    category[i].amount++;
                    const tmp = hashMap[category[i].name];
                    // find index subCat with value is same as tmp
                    const index = category[i].subCat.findIndex(subCat => subCat === tmp);
                    category[i].amountSubCat[index]++;
                }
            } else {
                for (let i = 0; i < category.length; i++) {
                    category[i].amount++;
                    for (let j = 0; j < category[i].subCat.length; j++) {
                        const temp = hashMap[category[i].name]
                        if (temp.includes(category[i].subCat[j])) {
                            category[i].amountSubCat[j]++;
                        }
                    }
                }
            }
            for (let i = 0; i < category.length; i++) {
                await CategoryModel.findByIdAndUpdate(category[i]._id, category[i]);
            }


            console.log(categorySaveInProduct)


            const product = new Product({


                name: req.body.nameProduct,
                description: req.body.description,
                category: categorySaveInProduct || [],
                currentPrice: +req.body.currentPrice,
                // convert date from string to date using moment
                expDate: req.body.expDate ? new Date(req.body.expDate) : new Date() + 24 * 60 * 60 * 1000,
                bestPrice: +req.body.bestPrice,
                stepPrice: +req.body.nextPrice,
                images: images,
                seller: res.locals.userLocal._id,
                autoExtend: (+req.body.autoExtend === 1),
            });
            try {
                product.save();
            } catch (e) {
                res.status(400).send({
                    message: "Error uploading image"
                });
            }
        });
        res.redirect('back');

    },

    // upload: async (req, res) => {
    //     try {
    //         const upload = multer({ storage: storage }).array("imageList", 3);
    
    //         upload(req, res, async (err) => {
    //             if (err) {
    //                 console.error("Error uploading image:", err);
    //                 return res.status(400).send({ message: "Error uploading image kkk" });
    //             }
    
    //             try {
    //                 const images = req.files.map(file => file.path);
    //                 const hashMap = {};
    //                 let categorySaveInProduct = [];
    
    //                 if (typeof req.body.category === 'string') {
    //                     const category = req.body.category.split(',');
    //                     hashMap[category[1]] = category[0];
    //                     categorySaveInProduct.push(category[0]);
    //                     categorySaveInProduct.push(category[1]);
    //                 } else {
    //                     for (let i = 0; i < req.body.category.length; i++) {
    //                         var temp = req.body.category[i].split(',');
    //                         const category = temp[1];
    //                         const subCategory = temp[0];
    
    //                         if (hashMap[category]) {
    //                             hashMap[category].push(subCategory);
    //                         } else {
    //                             hashMap[category] = [subCategory];
    //                         }
    //                     }
    //                 }
    
    //                 for (let key in hashMap) {
    //                     for (let i = 0; i < hashMap[key].length; i++) {
    //                         categorySaveInProduct.push(hashMap[key][i]);
    //                     }
    //                     categorySaveInProduct.push(key);
    //                 }
    //                 categorySaveInProduct = [...new Set(categorySaveInProduct)];
    
    //                 const category = await CategoryModel.find({ name: { $in: Object.keys(hashMap) } });
    
    //                 for (let i = 0; i < category.length; i++) {
    //                     category[i].amount++;
    //                     const tmp = hashMap[category[i].name];
    //                     const index = category[i].subCat.findIndex(subCat => subCat === tmp);
    //                     category[i].amountSubCat[index]++;
    //                     await CategoryModel.findByIdAndUpdate(category[i]._id, category[i]);
    //                 }
    
    //                 const product = new Product({
    //                     name: req.body.nameProduct,
    //                     description: req.body.description,
    //                     category: categorySaveInProduct || [],
    //                     currentPrice: +req.body.currentPrice,
    //                     expDate: req.body.expDate ? new Date(req.body.expDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    //                     bestPrice: +req.body.bestPrice,
    //                     stepPrice: +req.body.nextPrice,
    //                     images: images,
    //                     seller: res.locals.userLocal._id,
    //                     autoExtend: (+req.body.autoExtend === 1),
    //                 });
    
    //                 await product.save();
    //                 res.redirect('back');
    //             } catch (error) {
    //                 console.error("Error processing images and creating product:", error);
    //                 return res.status(500).send({ message: "Internal server error" });
    //             }
    //         });
    //     } catch (uploadError) {
    //         console.error("Error during image upload:", uploadError);
    //         return res.status(500).send({ message: "Internal server error" });
    //     }
    // },
    

    async dashboard(req, res) {
        const id = req.query.id;
        if (id) {
            const user = await User.findById(id).lean();
            const itemswon = await WinnigBid.find({
                userId: id,
            });

            if (user) {
                var nItems = 0
                if (itemswon) {
                    nItems = itemswon.length;
                }

                const currentBid = user.currentBiddingList || [];
                res.render('dashboard', {
                    user: user,
                    activebid: currentBid.length,
                    itemwon: nItems
                });

            }
        } else {
            res.render('404', {
                layout: false
            });
        }
    },
    async updateProfile(req, res) {
        const id = req.query.id;
        if (id && req.body) {
            const user = await User.findById(id);
            if (user) {
                if (req.body.email) {
                    const checkEmail = await User.findOne({
                        profile: {
                            email: req.body.email
                        }
                    });
                    if (!checkEmail || checkEmail._id === user._id) {
                        user.profile.email = req.body.email;
                    }
                } else if (user.method === "local" && req.body.newpass && req.body.oldpass) {
                    const matched = await bcrypt.compare(req.body.oldpass, user.secret);
                    if (matched) {
                        const salt = bcrypt.genSaltSync(10);
                        const password = bcrypt.hashSync(req.body.newpass, salt);
                        user.secret = password;
                    }
                } else {
                    user.profile.name = req.body.name || user.profile.name;
                    user.profile.address = req.body.address || user.profile.address;
                }
                await user.save();
                req.session.retUrl = req.session.retUrl || '/';
                res.redirect(req.session.retUrl);
            }
        }
        res.render('404', {
            layout: false
        });

    },
    async profile(req, res) {
        const id = req.query.id;
        if (id) {
            const user = await User.findById(id).lean();
            const itemswon = await WinnigBid.find({
                userId: id,
            });

            if (user) {
                var nItems = 0;
                var isOwner = false;
                if (itemswon) {
                    nItems = itemswon.length;
                }
                if (res.locals.userLocal) {
                    isOwner = (id === res.locals.userLocal._id.toString());
                }

                const currentBid = user.currentBid || [];
                res.render('profile', {
                    user: user,
                    owner: isOwner,
                    islocal: user.method === 'local',
                    isBidder: user.type === 'bidder',
                    // isPending: (!user.request.isAccepted && user.request.isRequest) || false,
                });
                return;
            }
        }
        res.render('404', {
            layout: false
        });

    },
    async upgradeRole(req, res) {
        const id = req.query.id;
        if (req.user.type !== 'bidder') {
            res.redirect(`/user/profile?id=${id}`);
            return;
        }
        if (id) {
            const user = await User.findById(id);

            if (user) {
                user.request.isAccepted = false;
                user.request.isRequest = true;
                user.save();
            }
            res.redirect(`/user/profile?id=${id}`);
            return;
        }
        res.render('404');

    },
    async wishlist(req, res) { // user/wishlist
        // find user by id
        const id = req.query.id;
        const user = await User.findById(res.locals.userLocal._id);
        // // check that wishlist that stored in user.wishlist
        // contains the product id
        const isInWishlist = user.wishlist.includes(id);
        if (isInWishlist) {
            // remove product id from wishlist
            user.wishlist = user.wishlist.filter(productId => productId !== id);
        } else {
            // add product id to wishlist
            user.wishlist.push(id);
        }
        // save user
        if (!user.currentBiddingList) {
            user.currentBiddingList = [];
        }
        await user.save();

        return res.json({
            success: !isInWishlist
        });

    },
    async showWishList(req, res) {
        const id = req.query.id;
        const user = await User.findById(id);
        if (user) {
            const wishList = user.wishlist;
            const wishProducts = [];
            for (let i = 0; i < wishList.length; i++) {
                wishProducts.push(await Product.findById(wishList[i]).lean());
                var diff = moment.duration(moment(wishProducts[i].sellDate).diff(moment())).asHours();
                wishProducts[i].isNew = (0 < Math.abs(diff)) && (Math.abs(diff) < 24);
                wishProducts[i].expDate = moment(wishProducts[i].expDate).format("YYYY-MM-DD HH:MM:SS");
                wishProducts[i].expDate = "" + moment(wishProducts[i].expDate).valueOf();
                wishProducts[i].numberBidders = wishProducts[i].historyBidId.length;
            }
            res.render('wishlist', {
                user: user,
                wishProducts: wishProducts,
                username: res.locals.userLocal.profile.name,
            })
        } else {
            res.render('404');
        }

    },
    async mybid(req, res) {
        const id = req.query.id;
        const user = await User.findById(id);
        if (user) {
            const currentBid = user.currentBiddingList;
            const currentProducts = [];
            for (let i = 0; i < currentBid.length; i++) {
                currentProducts.push(await Product.findById(currentBid[i].idProduct).lean());
                var diff = moment.duration(moment(currentProducts[i].sellDate).diff(moment())).asHours();
                currentProducts[i].isNew = (0 < Math.abs(diff)) && (Math.abs(diff) < 24);
                currentProducts[i].expDate = moment(currentProducts[i].expDate).format("YYYY-MM-DD HH:MM:SS");
                currentProducts[i].expDate = "" + moment(currentProducts[i].expDate).valueOf();
                currentProducts[i].numberBidders = currentProducts[i].historyBidId.length;
            }
            var username = "";
            if (res.locals.userLocal) {
                username = res.locals.userLocal.profile.name;
            }

            const myMap = new Map();
            for (const wish of user.wishlist) {
                myMap.set(wish, wish);
            }
            const currentList = res.locals.userLocal.currentBiddingList;
            const myMap2 = new Map();
            for (const current of currentList) {
                myMap2.set(current.idProduct, current.idProduct);
            }
            for (let i = 0; i < currentProducts.length; i++) {
                currentProducts[i].isWishlist = '' + currentProducts[i]._id === '' + myMap.get(currentProducts[i]._id + "");
                currentProducts[i].isBidding = '' + currentProducts[i]._id === '' + myMap2.get(currentProducts[i]._id + "");
            }
            res.render('myBid', {
                user: user,
                currentProducts: currentProducts,
                username: username,
            })
        } else {
            res.render('404');
        }
    },
    async winningbid(req, res) {
        const id = req.query.id;
        const user = await User.findById(id);
        if (user) {
            const winningList = await WinnigBid.find({
                userId: id
            });
            const winnignProducts = [];
            for (let i = 0; i < winningList.length; i++) {
                winnignProducts.push(await Product.findById(winningList[i].productId).lean());
                var diff = moment.duration(moment(winnignProducts[i].sellDate).diff(moment())).asHours();
                winnignProducts[i].isNew = (0 < Math.abs(diff)) && (Math.abs(diff) < 24);
                winnignProducts[i].expDate = moment(winnignProducts[i].expDate).format("YYYY-MM-DD HH:MM:SS");
                winnignProducts[i].expDate = "" + moment(winnignProducts[i].expDate).valueOf();
                winnignProducts[i].numberBidders = winnignProducts[i].historyBidId.length;
            }
            var username = "";
            if (res.locals.userLocal) {
                username = res.locals.userLocal.profile.name;
            }

            const myMap = new Map();
            for (const wish of user.wishlist) {
                myMap.set(wish, wish);
            }
            const currentList = res.locals.userLocal.currentBiddingList;
            const myMap2 = new Map();
            for (const current of currentList) {
                myMap2.set(current.idProduct, current.idProduct);
            }
            for (let i = 0; i < winnignProducts.length; i++) {
                winnignProducts[i].isWishlist = '' + winnignProducts[i]._id === '' + myMap.get(winnignProducts[i]._id + "");
                winnignProducts[i].isBidding = '' + winnignProducts[i]._id === '' + myMap2.get(winnignProducts[i]._id + "");
            }
            res.render('winningBid', {
                user: user,
                winnignProducts: winnignProducts,
                username: username,
            })
        } else {
            res.render('404');
        }
    },
    async feedback(req, res) {
        const id = req.query.id;
        const user = await User.findById(id).lean();
        if (user) {
            var reviewsList = user.reviews;
            for (let i = 0; i < reviewsList.length; i++) {
                reviewsList[i].isLike = (reviewsList[i].point > 0);
                var temp = await User.findById(reviewsList[i].author).lean();
                if (temp) {
                    reviewsList[i].date = moment(reviewsList[i].date).format('HH:MM DD/MM/YYYY');
                    reviewsList[i].authorName = temp.profile.name;
                    reviewsList[i].userAvatar = temp.profile.avatar || '/img/c1.png';
                }
            }
            res.render('myfeedback', {
                reviewsList: reviewsList,
                isHaveFeedBack: reviewsList.length > 0
            })
        } else {
            res.render('404');
        }
    },
    async givefeedback(req, res) {
        const id = req.query.id;
        const user = await User.findById(id);
        if (user) {
            const point = req.body.givedpoint;
            const msg = req.body.msg;

            var rev = user.reviews;
            rev.push({
                author: res.locals.userLocal._id,
                point: point,
                message: msg,
                date: new Date()
            });
            console.log(user.reviews[0]);
            user.point += parseInt(point);
            user.save();
            res.redirect('back');

        }
    },
    async myproduct(req, res) {
        const id = req.query.id;
        const user = await User.findById(id);
        if (user) {
            const myProducts = await Product.find({
                seller: id
            });
            const productList = [];
            for (let i = 0; i < myProducts.length; i++) {
                productList.push(await Product.findById(myProducts[i]._id).lean());
                var diff = moment.duration(moment(productList[i].sellDate).diff(moment())).asHours();
                productList[i].isNew = (0 < Math.abs(diff)) && (Math.abs(diff) < 24);
                productList[i].expDate = moment(productList[i].expDate).format("YYYY-MM-DD HH:MM:SS");
                productList[i].expDate = "" + moment(productList[i].expDate).valueOf();
                productList[i].numberBidders = productList[i].historyBidId.length;
            }
            var username = "";
            if (res.locals.userLocal) {
                username = res.locals.userLocal.profile.name;
            }

            const myMap = new Map();
            for (const wish of user.wishlist) {
                myMap.set(wish, wish);
            }
            const currentList = res.locals.userLocal.currentBiddingList;
            const myMap2 = new Map();
            for (const current of currentList) {
                myMap2.set(current.idProduct, current.idProduct);
            }
            for (let i = 0; i < productList.length; i++) {
                productList[i].isWishlist = '' + productList[i]._id === '' + myMap.get(productList[i]._id + "");
                productList[i].isBidding = '' + productList[i]._id === '' + myMap2.get(productList[i]._id + "");
            }
            res.render('myProduct', {
                user: user,
                productList: productList,
                username: username,
            })
        } else {
            res.render('404');
        }
    },
    async isEnoughPoint(req, res) {
        const id = req.query.id;
        if (id) {
            const user = await User.findById(id);

            if (user) {
                if (user.point >= 80) {
                    return res.json({
                        success: true
                    })
                }
            }
        }
        return res.json({
            success: false
        })

    },
    async isCanSignUp(req, res) {
        const email = req.query.email || '';
        const authId = req.query.authId || '';

        if (authId) {
            // check that authId that exist in user.auth
            // FIND one by authId
            const user = await User.findOne({
                authId: authId
            });

            if (user) {
                return res.json({
                    success: false,
                });
            } else {
                return res.json({
                    success: true,
                });
            }
        }

        if (email) {
            const user = await User.findOne({
                'profile.email': email
            });
            if (user) {
                return res.json({
                    success: false,
                });
            } else {
                return res.json({
                    success: true,
                });
            }
        }

        return res.json({
            success: true
        });


    }
};