const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Package = require('../models/Package');
const Gallery = require('../models/Gallery');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Testimonial = require('../models/Testimonial');
const Video = require('../models/Video');
const MainBanner = require('../models/MainBanner');

router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });

        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });

        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fixed Departure category id
        const fixedDepartureCategoryId = '6848056f80e92de2c956def0';

        // Get all active packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Separate Fixed Departure packages
        const fixedDeparturePackages = packages.filter(pkg =>
            pkg.category && pkg.category._id && pkg.category._id.toString() === fixedDepartureCategoryId
        );

        // All other packages (excluding Fixed Departure)
        const otherPackages = packages.filter(pkg =>
            !(pkg.category && pkg.category._id && pkg.category._id.toString() === fixedDepartureCategoryId)
        );

        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);

        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);

        const videos = await Video.find().sort({ createdAt: -1 }).limit(3);

        // For each category, include all packages (including Fixed Departure)
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length 
            };
        });

        // processedPackages should include all packages (not just otherPackages)
        const processedPackages = packages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') +
                (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        const processedFixedDeparturePackages = fixedDeparturePackages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') +
                (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        res.render('index', {
            title: 'Home Page',
            banners: banners,
            mainbanners: mainbanners,
            categories: categoryMap,
            packages: processedPackages,
            fixedDeparturePackages: processedFixedDeparturePackages,
            featuredPackages: processedPackages.slice(0, 3),
            blogs: blogs,
            testimonials: testimonials,
            videos: videos,
            discount: Math.random() > 0.9 ? Math.floor(Math.random() * 15) + 10 : 0,
            query: req.query
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading home page data');
    }
});

router.get('/about', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);
        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });
        const gallery = await Gallery.find().sort({ createdAt: -1 }).limit(20);
        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages, // ✅ for dropdown logic
                locationCount: categoryPackages.length // ✅ keep this if you use it
            };
        });
        res.render('about', {
            title: 'About Us',
            categories: categoryMap,
            blogs: blogs,
            gallery: gallery,
            testimonials,
            mainbanners
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading about us page data');
    }
});
router.get('/blogs', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Fetch blogs with pagination
        const blogs = await Blog.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages, // ✅ for dropdown logic
                locationCount: categoryPackages.length // ✅ keep this if you use it
            };
        });
        // Get total number of blogs for pagination
        const totalBlogs = await Blog.countDocuments();

        res.render('blogs', {
            title: 'Blogs',
            blogs: blogs,
            categories: categoryMap,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBlogs / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading blogs page data');
    }
});
router.get('/gallery', async (req, res) => {
    try {
        // Pagination for gallery and videos
        const { page = 1 } = req.query;
        const galleryLimit = 10;
        const videoLimit = 9;
        const galleryPage = parseInt(page) || 1;
        const videoPage = parseInt(req.query.videoPage) || 1;

        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Map categories
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Gallery pagination
        const totalGalleryItems = await Gallery.countDocuments();
        const gallery = await Gallery.find()
            .skip((galleryPage - 1) * galleryLimit)
            .limit(galleryLimit);

        // Videos pagination
        const totalVideos = await Video.countDocuments();
        const videos = await Video.find()
            .sort({ createdAt: -1 })
            .skip((videoPage - 1) * videoLimit)
            .limit(videoLimit);

        res.render('gallery', {
            title: 'Gallery',
            categories: categoryMap,
            gallery,
            videos,
            currentPage: galleryPage,
            totalPages: Math.ceil(totalGalleryItems / galleryLimit),
            videoCurrentPage: videoPage,
            videoTotalPages: Math.ceil(totalVideos / videoLimit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading gallery page data');
    }
});


router.get('/contact', async (req, res) => {
    try {
        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Process category map
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Render contact page with categories
        res.render('contact', {
            title: 'Contact Us',
            categories: categoryMap
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading contact page data');
    }
});
router.get('/packages', async (req, res) => {
    try {
        const {
            category,
            subCategory,
            search,
            minPrice,
            maxPrice,
            duration,
            tourType,
            page = 1,
            limit = 10
        } = req.query;

        const skip = (page - 1) * limit;
        const matchQuery = { isActive: true };

        // Handle category filtering
        if (category) {
            const categoryIds = Array.isArray(category)
                ? category
                : category.split(',').map(id => new mongoose.Types.ObjectId(id));
            
            matchQuery.category = { $in: categoryIds };
        }

        // Handle subcategory filtering
        if (subCategory) {
            const subCategoryIds = Array.isArray(subCategory)
                ? subCategory
                : subCategory.split(',').map(id => new mongoose.Types.ObjectId(id));
            
            matchQuery.subCategory = { $in: subCategoryIds };
        }

        if (duration) matchQuery.duration = duration;
        if (tourType) matchQuery.tourType = tourType;

        if (minPrice || maxPrice) {
            matchQuery.packagePrice = {};
            if (minPrice) matchQuery.packagePrice.$gte = Number(minPrice);
            if (maxPrice) matchQuery.packagePrice.$lte = Number(maxPrice);
        }

        const searchRegex = search && search.length >= 3 ? new RegExp(search, 'i') : null;

        // Main aggregation pipeline
        const aggregationPipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $addFields: {
                    subCategoryObj: {
                        $filter: {
                            input: '$category.subCategories',
                            as: 'subCat',
                            cond: { $eq: ['$$subCat._id', '$subCategory'] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    subCategory: { $arrayElemAt: ['$subCategoryObj', 0] }
                }
            }
        ];

        // Add search if applicable
        if (searchRegex) {
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: searchRegex } },
                        { destination: { $regex: searchRegex } },
                        { packageDescription: { $regex: searchRegex } },
                        { 'category.name': { $regex: searchRegex } },
                        { 'subCategory.name': { $regex: searchRegex } },
                    ]
                }
            });
        }

        // Get total count and paginated results
        const [packageResults, totalResult, categories] = await Promise.all([
            Package.aggregate([...aggregationPipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
            Package.aggregate([...aggregationPipeline, { $count: 'total' }]),
            Category.find({ isActive: true }).select('name imageUrl subCategories').lean().sort({ createdAt: -1 })
        ]);

        const totalPackages = totalResult.length > 0 ? totalResult[0].total : 0;

        // Prepare response
        const responseData = {
            title: 'Tour Packages',
            packages: packageResults,
            categories: categories.map(cat => ({
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                packageCount: packageResults.filter(p => p.category._id.equals(cat._id)).length
            })),
            currentCategory: category,
            currentSubCategory: subCategory,
            searchTerm: search,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPackages / limit),
            query: req.query
        };

        res.render('packages', responseData);
    } catch (error) {
        console.error('Error in /packages route:', error);
        res.status(500).send('Server Error');
    }
});
  

// Package details page
router.get('/package/:id', async (req, res) => {
    try {
        const tourPackage = await Package.findById(req.params.id)
            .populate('category', 'name')
            .populate('subCategory', 'name');

        if (!tourPackage) {
            return res.status(404).render('comming-soon', {
                message: 'Package not found'
            });
        }

        const categoriesRaw = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const allPackages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg =>
                pkg.category?._id.toString() === cat._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                directPackages,
                packages: categoryPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('packageDetails', {
            title: tourPackage.title,
            tourPackage,
            categories // ✅ now with directPackages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Package details by subcategory
router.get('/package-details', async (req, res) => {
    try {
        const { subCategory } = req.query;
        const category = await Category.findOne(
            { 'subCategories._id': subCategory },
            {
                name: 1,
                'subCategories.$': 1
            }
        );

        if (!category || !category.subCategories || category.subCategories.length === 0) {
            return res.status(404).render('comming-soon', {
                message: 'Subcategory not found'
            });
        }

        const subCategoryData = category.subCategories[0];

        // Get the FIRST package in this subcategory
        const tourPackage = await Package.findOne({
            subCategory: subCategory,
            isActive: true
        })
            .populate('category', 'name')
            .populate('subCategory', 'name');

        if (!tourPackage) {
            return res.status(404).render('comming-soon', {
                message: 'No packages found in this subcategory'
            });
        }

        // Build categories for navigation (same as in other routes)
        const categoriesRaw = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const allPackages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg =>
                pkg.category?._id.toString() === cat._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                directPackages,
                packages: categoryPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('packageDetails', {
            title: tourPackage.title || subCategoryData.name,
            tourPackage: tourPackage,
            subCategory: subCategoryData,
            parentCategory: {
                _id: category._id,
                name: category.name
            },
            categories
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.get('/blogdetails', async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).send('Blog ID is required');
        }

        const blog = await Blog.findById(id).lean();

        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const relatedBlogs = await Blog.find({ _id: { $ne: id } })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        res.render('blogdetails', {
            title: blog.title || 'Blog Details',
            blog: blog,
            relatedBlogs: relatedBlogs,
            categories
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading blog details page data');
    }
});

router.get('/customTours', async (req, res) => {
    try {
        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Process category map
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Render contact page with categories
        res.render('customTours', {
            title: 'customTours',
            categories: categoryMap
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading customTours page data');
    }
});





module.exports = router;